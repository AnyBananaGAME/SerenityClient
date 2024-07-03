import { Address, BasePacket, ConnectedPing, ConnectedPong, ConnectionRequestAccepted, Frame, FrameSet, NewIncomingConnection, Packet, Priority, Reliability } from "@serenityjs/raknet";
import RakNetClient from "./RaknetClient";
import { BinaryStream } from "@serenityjs/binarystream";
import { accessSync } from "fs";
import { NetworkSettingsPacket } from "@serenityjs/protocol";
import GamePackets from "../packets/GamePackets";
import Client from "../Client";

export class FrameHandler {
	private receivedFrameSequences = new Set<number>();
	private lostFrameSequences = new Set<number>();
	private inputHighestSequenceIndex: Array<number>;
	private fragmentsQueue: Map<number, Map<number, Frame>> = new Map();
	private inputOrderIndex: Array<number>;
	private inputOrderingQueue: Map<number, Map<number, Frame>> = new Map();
	private lastInputSequence = -1;


	constructor(private client: RakNetClient) {
        this.inputOrderIndex = Array.from<number>({ length: 32 }).fill(0);
		this.inputHighestSequenceIndex = Array.from<number>({ length: 32 }).fill(0);
		for (let index = 0; index < 32; index++) {
			this.inputOrderingQueue.set(index, new Map());
		}
    }

	public handleBatchError(error: Error | unknown, packetID: number){
		console.info("Error at packet ", packetID)
		console.error(error)
	}

	public incomingBatch(buffer: Buffer): void {
        if (buffer.length <= 0) {
			console.error('Received an empty buffer!');
			return;
		}
        const header = (buffer[0] as number);
		switch (header) {
			default: {
				// Format the packet id to a hex string
				const id = header.toString(16).length === 1 ? '0' + header.toString(16) : header.toString(16);
				console.log(buffer)	
				return console.log(`Caught unhandled packet 0x${id}!`);	
				break;
			}

			case 254: {
				console.log('Received Game packet');
				/** @ts-ignore */
				const packet = new GamePackets[buffer[2]](buffer) as BasePacket;
				if(Client.debug) console.log(GamePackets[buffer[2]].name)//.deserialize().name)
				this.client.client.emit(GamePackets[buffer[2]].name, packet.deserialize());
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

				const packet = new NewIncomingConnection();
                /** @ts-ignore */
                packet.serverAddress = new Address(des.address.address, des.address.port, 4);
                /** @ts-ignore */
				packet.internalAddress = new Address(this.client.socket.address().address, this.client.socket.address().port, 6)

				packet.incomingTimestamp = BigInt(Date.now());
				packet.serverTimestamp = des.timestamp;

                try {
                    const frame = new Frame();
				    frame.reliability = Reliability.ReliableOrdered;
                    frame.orderChannel = 0;
    			    frame.payload = packet.serialize();
                    console.log(frame)
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
				console.log('Received NewIncomingConnection packet');
			}
			
		}
    }


    public handleFragment(frame: Frame) {
		if (this.fragmentsQueue.has(frame.fragmentId)) {
			const fragment = this.fragmentsQueue.get(frame.fragmentId);

			// Check if the fragment is null
			if (!fragment) return;

			// Set the split frame to the fragment
			fragment.set(frame.fragmentIndex, frame);

			// Check if we have all the fragments
			// Then we can rebuild the packet
			if (fragment.size === frame.fragmentSize) {
				const stream = new BinaryStream();
				// Loop through the fragments and write them to the stream
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

				// Handle the packet
				try {
						this.incomingBatch(frame.payload);
				} catch (error) {
					this.handleBatchError(error, frame.payload[0]);
				}
				let index = this.inputOrderIndex[frame.orderChannel] as number;
				const outOfOrderQueue = this.inputOrderingQueue.get(frame.orderChannel) as Map<number, Frame>;
				for (; outOfOrderQueue.has(index); index++) {
					// Get the frame from the queue
					const frame = outOfOrderQueue.get(index);

					// Check if the frame is null
					if (!frame) break;

					// Handle the packet and delete it from the queue
					try {
								this.incomingBatch(frame.payload);
					} catch (error) {
						this.handleBatchError(error, frame.payload[0]);
					}
					outOfOrderQueue.delete(index);
				}

				// Update the queue
				this.inputOrderingQueue.set(frame.orderChannel, outOfOrderQueue);
				this.inputOrderIndex[frame.orderChannel] = index;
			}
        } else if (frame.orderIndex > (this.inputOrderIndex[frame.orderChannel] as number)) {
            const unordered = this.inputOrderingQueue.get(frame.orderChannel);
            if (!unordered) return;
            unordered.set(frame.orderIndex, frame);
        }  else {
			try {
				return this.incomingBatch(frame.payload);
			} catch (error) {
				this.handleBatchError(error, frame.payload[0]);
			}
        }
    }

	public handleIncomingFrameSet(buffer: Buffer): void {
        //console.debug("frameset - ", buffer[0])
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