import { Address, BasePacket, ConnectedPing, ConnectedPong, ConnectionRequestAccepted, Disconnect, Frame, FrameSet, NewIncomingConnection, Packet, Priority, Reliability } from "@serenityjs/raknet";
import RakNetClient from "./RaknetClient";
import { BinaryStream } from "@serenityjs/binarystream";
import { accessSync } from "fs";
import { CompressionMethod, Framer, getPacketId, Packets } from "@serenityjs/protocol";
import Client from "../Client";
import OhMyNewIncommingConnection from "../packets/raknet/OhMyNewIncommingConnection";
import * as fs from "fs";
import { inflateRawSync } from "zlib";
import * as snappy from "snappyjs";
import { PacketEncryptor } from "../PacketEncryptor";

export class FrameHandler {
	private receivedFrameSequences = new Set<number>();
	private lostFrameSequences = new Set<number>();
	private inputHighestSequenceIndex: Array<number>;
	private fragmentsQueue: Map<number, Map<number, Frame>> = new Map();
	private inputOrderIndex: Array<number>;
	private inputOrderingQueue: Map<number, Map<number, Frame>> = new Map();
	private lastInputSequence = -1;
	public compressionMethod: number = CompressionMethod.None; // No compression right now (Sould be 01 after NetworkSettings Packet)

	constructor(private client: RakNetClient) {
        this.inputOrderIndex = Array.from<number>({ length: 32 }).fill(0);
		this.inputHighestSequenceIndex = Array.from<number>({ length: 32 }).fill(0);
		for (let index = 0; index < 32; index++) {
			this.inputOrderingQueue.set(index, new Map());
		}
    }

	public handleBatchError(error: Error | unknown, packetID: number){
		console.info("Error at packet ", packetID);
		console.error(error);
	}

	public async incomingBatch(buffer: Buffer): Promise<void> {
        if (buffer.length <= 0) {
			console.error('Received an empty buffer!');
			return;
		}

        const header = (buffer[0] as number);
		const id = header.toString(16).length === 1 ? '0' + header.toString(16) : header.toString(16);
		switch (header) {
			default: {
				return console.log(`Caught unhandled packet 0x${id}!`);	
				break;
			}

			case 254: {
				let i = 1;
				
				let decrypted = buffer.subarray(1);
		
				if (_client.encryption) {
					decrypted = _encryptor.decryptPacket(decrypted);
				}

				const algorithm: CompressionMethod = CompressionMethod[
					decrypted[0] as number
				]
					? decrypted.readUint8()
					: CompressionMethod.NotPresent;
	
				if (algorithm !== CompressionMethod.NotPresent)
					decrypted = decrypted.subarray(i);

				let inflated: Buffer;

				switch (algorithm) {
					case CompressionMethod.Zlib: {
						inflated = inflateRawSync(decrypted);
						break;
					}
					case CompressionMethod.None:
					case CompressionMethod.NotPresent: {
						inflated = decrypted;
						break;
					}
					default: {
						return console.error(
							`Received invalid compression algorithm !`,
							CompressionMethod[algorithm]
						);
					}
				}
						
				let frames;
				try {
					frames = Framer.unframe(inflated);
				} catch (error) {
					console.log(error);
				}
				if(!frames) return;
				for (const frame of frames) {
					const id = getPacketId(frame);
					const packet = Packets[id];
					const instance = new packet(frame).deserialize();
					console.log(instance)
					this.client.client.emit(Packets[id].name, instance);
				}
				return;
			}

			case Packet.Disconnect: {
				const packet = new Disconnect(buffer);
				const des = packet.deserialize();
				this.client.client.disconnect("raknet-disconnected");
				break;
			}
			case Packet.ConnectedPong: {
				const pong = new ConnectedPong(buffer);
				const des = pong.deserialize();
				const ping = new ConnectedPing();
				ping.timestamp = des.timestamp;

				const frame = new Frame();
				frame.reliability = Reliability.Unreliable;
				frame.orderChannel = 0;
				frame.payload = ping.serialize();
			
				this.client.queue.sendFrame(frame, Priority.Immediate);
				break;
			}

			case Packet.ConnectedPing: {
				const packet = new ConnectedPing(buffer);
				const deserializedPacket = packet.deserialize();
				
				const pong = new ConnectedPong();
				pong.pingTimestamp = deserializedPacket.timestamp;
				pong.timestamp = BigInt(Date.now());

				const frame = new Frame();
				frame.reliability = Reliability.Unreliable;
				frame.orderChannel = 0;
				frame.payload = pong.serialize();
			
				this.client.queue.sendFrame(frame, Priority.Immediate);
				break;
			}

			case Packet.ConnectionRequestAccepted: {
				const IncomingPacket = new ConnectionRequestAccepted(buffer);
				const des = IncomingPacket.deserialize();
				if (!des) {
					console.error('Failed to deserialize IncomingPacket!');
					return;
				}
				/** @ts-ignore */
				let packet;
				if(this.client.client.serverName == "PocketMine-MP" || this.client.client.serverName == "bedrock-protocol"){
					packet = new OhMyNewIncommingConnection();
					packet.internalAddress = new Array<Address>()
					for (let i = 0; i < 10; i++) {
						packet.internalAddress[i] = new Address('0.0.0.0', 0, 4);
					}
				} else {
					packet = new NewIncomingConnection();
       				/** @ts-ignore */
					packet.internalAddress = new Address(this.client.socket.address().address, this.client.socket.address().port, 6)
				}			
				/** @ts-ignore */
				packet.serverAddress = new Address(des.address.address, des.address.port, 4);
				packet.incomingTimestamp = BigInt(Date.now());
				packet.serverTimestamp = des.timestamp; 

				const date = new Date();
                try {
                    const frame = new Frame();
				    frame.reliability = Reliability.ReliableOrdered;
                    frame.orderChannel = 0;
    			    frame.payload = packet.serialize();
                    if (!frame.payload) {
				    	console.error('Failed to serialize the packet!');
				    	return;
				    }

				    this.client.queue.sendFrame(frame, Priority.Immediate);
					void this.client.emit("connect", this);
                } catch(error){
                        console.log("Error in Frame Serialise")
                        console.error(error)
				        break;
                }
                break;
			}

			case Packet.NewIncomingConnection: {

			}
			
		}
    }


    public handleFragment(frame: Frame) {
		if (this.fragmentsQueue.has(frame.fragmentId)) {
			const fragment = this.fragmentsQueue.get(frame.fragmentId);
			if (!fragment) return;

			fragment.set(frame.fragmentIndex, frame);

			if (fragment.size === frame.fragmentSize) {
				const stream = new BinaryStream();
				for (let index = 0; index < fragment.size; index++) {
					const sframe = fragment.get(index) as Frame;
					stream.writeBuffer(sframe.payload);
				}
            	const nframe = new Frame();
				nframe.reliability = frame.reliability;
				nframe.reliableIndex = frame.reliableIndex;
				nframe.sequenceIndex = frame.sequenceIndex;
				nframe.orderIndex = frame.orderIndex;
				nframe.orderChannel = frame.orderChannel;
				nframe.payload = stream.getBuffer();
				this.fragmentsQueue.delete(frame.fragmentId);
				return this.handleFrame(nframe);
			}
		} else {
			this.fragmentsQueue.set(frame.fragmentId, new Map([[frame.fragmentIndex, frame]]));
		}
    }

    public handleFrame(frame: Frame): void {
        //console.debug("handleFrame")
		if (frame.isFragmented()) return this.handleFragment(frame);
		if (frame.isSequenced()) {
        } else if (frame.isOrdered()) {
            if (frame.orderIndex === this.inputOrderIndex[frame.orderChannel]) {
				this.inputHighestSequenceIndex[frame.orderChannel] = 0;
				this.inputOrderIndex[frame.orderChannel] = frame.orderIndex + 1;

				try {
						this.incomingBatch(frame.payload);
				} catch (error) {
					this.handleBatchError(error, frame.payload[0]);
				}
				let index = this.inputOrderIndex[frame.orderChannel] as number;
				const outOfOrderQueue = this.inputOrderingQueue.get(frame.orderChannel) as Map<number, Frame>;
				for (; outOfOrderQueue.has(index); index++) {
					const frame = outOfOrderQueue.get(index);
					if (!frame) break;
					try {
						this.incomingBatch(frame.payload);
					} catch (error) {
						this.handleBatchError(error, frame.payload[0]);
					}
					outOfOrderQueue.delete(index);
				}

				this.inputOrderingQueue.set(frame.orderChannel, outOfOrderQueue);
				this.inputOrderIndex[frame.orderChannel] = index;
			}
        } else if (frame.orderIndex > (this.inputOrderIndex[frame.orderChannel] as number)) {
            const unordered = this.inputOrderingQueue.get(frame.orderChannel);
            if (!unordered) return;
            unordered.set(frame.orderIndex, frame);
        }  else {
			try {
				this.incomingBatch(frame.payload);
				return;
			} catch (error) {
				this.handleBatchError(error, frame.payload[0]);
			}
        }
    }

	public handleIncomingFrameSet(buffer: Buffer): void {
		const frameset = new FrameSet(buffer).deserialize();
        if (frameset.sequence < this.lastInputSequence || frameset.sequence === this.lastInputSequence) {
			console.log(`Received out of order frameset ${frameset.sequence}`);
		}
        this.receivedFrameSequences.add(frameset.sequence);
        const diff = frameset.sequence - this.lastInputSequence;
        if (diff !== 1) {
			for (let index = this.lastInputSequence + 1; index < frameset.sequence; index++) {
				if (!this.receivedFrameSequences.has(index)) {
					this.lostFrameSequences.add(index);
				}
			}
		}
        this.lastInputSequence = frameset.sequence;
		for (const frame of frameset.frames) {
			this.handleFrame(frame);
		}
    }
}