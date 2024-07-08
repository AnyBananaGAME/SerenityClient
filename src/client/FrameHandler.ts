import { Address, ConnectedPing, ConnectedPong, ConnectionRequestAccepted, Frame, FrameSet, Packet, Priority, Reliability } from "@serenityjs/raknet";
import RakNetClient from "./RaknetClient";
import OhMyNewIncommingConnection from "../packets/raknet/OhMyNewIncommingConnection";
import { GAME_BYTE } from "@serenityjs/network";
import { CompressionMethod, Framer, getPacketId, LevelChunkPacket, Packets, SetEntityDataPacket, StartGamePacket } from "@serenityjs/protocol";
import { inflateRawSync } from "zlib";
import Logger from "../utils/Logger";
import { BinaryStream } from "@serenityjs/binarystream";

export class FrameHandler {
    private fragmentedPackets: Map<number, Map<number, Frame>> = new Map();
    private reliablePackets: Map<number, Frame> = new Map();
    private orderedPackets: Map<number, Map<number, Frame>> = new Map();
    private highestSequence: number = -1;
    private lastInputSequence: number = -1;
    private receivedFrameSequences: Set<number> = new Set();
    private lostFrameSequences: Set<number> = new Set();
    private inputHighestSequenceIndex: number[] = new Array(32).fill(0);
    private inputOrderIndex: number[] = new Array(32).fill(0);

    private raknet: RakNetClient;

    constructor(raknet: RakNetClient) {
        this.raknet = raknet;
    }

    handleFrameSet(buffer: Buffer): void {
        const frameSet = new FrameSet(buffer).deserialize();
        if (frameSet.sequence <= this.highestSequence) {
            Logger.debug(`Ignoring old or duplicate FrameSet: ${frameSet.sequence}`);
            return;
        }

        this.receivedFrameSequences.add(frameSet.sequence);
        const diff = frameSet.sequence - this.lastInputSequence;

        if (diff !== 1) {
            for (let index = this.lastInputSequence + 1; index < frameSet.sequence; index++) {
                if (!this.receivedFrameSequences.has(index)) {
                    this.lostFrameSequences.add(index);
                }
            }
        }

        this.lastInputSequence = frameSet.sequence;
        this.highestSequence = frameSet.sequence;

        for (const frame of frameSet.frames) {
            try {
                this.handleFrame(frame);
            } catch (error) {
                Logger.error(`Error processing frame: ${error}`);
            }
        }
    }

    private handleFrame(frame: Frame): void {
        if (frame.isFragmented()) {
            this.handleFragmentedFrame(frame);
        } else if (frame.isSequenced()) {
            this.handleSequencedFrame(frame);
        } else if (frame.isOrdered()) {
            this.handleOrderedFrame(frame);
        } else if (frame.isReliable()) {
            this.handleReliableFrame(frame);
        } else {
            this.processFrame(frame);
        }
    }

    private handleFragmentedFrame(frame: Frame): void {
        if (!this.fragmentedPackets.has(frame.fragmentId)) {
            this.fragmentedPackets.set(frame.fragmentId, new Map());
        }
        const fragments = this.fragmentedPackets.get(frame.fragmentId)!;
        fragments.set(frame.fragmentIndex, frame);

        if (fragments.size === frame.fragmentSize) {
            const stream = new BinaryStream();
            for (let index = 0; index < fragments.size; index++) {
                const fragment = fragments.get(index)!;
                stream.writeBuffer(fragment.payload);
            }
            const reassembledFrame = new Frame();
            Object.assign(reassembledFrame, frame);
            reassembledFrame.payload = stream.getBuffer();
            reassembledFrame.fragmentSize = 0;
            this.fragmentedPackets.delete(frame.fragmentId);
            this.handleFrame(reassembledFrame);
        }
    }

    private handleSequencedFrame(frame: Frame): void {
        if (
            frame.sequenceIndex < this.inputHighestSequenceIndex[frame.orderChannel] ||
            frame.orderIndex < this.inputOrderIndex[frame.orderChannel]
        ) {
            return Logger.warn(`Received out of order frame ${frame.sequenceIndex}`);
        }
        this.inputHighestSequenceIndex[frame.orderChannel] = frame.sequenceIndex + 1;
        this.processFrame(frame);
    }

    private handleOrderedFrame(frame: Frame): void {
        if (frame.orderIndex === this.inputOrderIndex[frame.orderChannel]) {
            this.inputHighestSequenceIndex[frame.orderChannel] = 0;
            this.inputOrderIndex[frame.orderChannel] = frame.orderIndex + 1;
            this.processFrame(frame);

            let index = this.inputOrderIndex[frame.orderChannel];
            const outOfOrderQueue = this.orderedPackets.get(frame.orderChannel) || new Map();
            while (outOfOrderQueue.has(index)) {
                const nextFrame = outOfOrderQueue.get(index)!;
                this.processFrame(nextFrame);
                outOfOrderQueue.delete(index);
                index++;
            }
            this.orderedPackets.set(frame.orderChannel, outOfOrderQueue);
            this.inputOrderIndex[frame.orderChannel] = index;
        } else if (frame.orderIndex > this.inputOrderIndex[frame.orderChannel]) {
            const outOfOrderQueue = this.orderedPackets.get(frame.orderChannel) || new Map();
            outOfOrderQueue.set(frame.orderIndex, frame);
            this.orderedPackets.set(frame.orderChannel, outOfOrderQueue);
        }
    }

    private handleReliableFrame(frame: Frame): void {
        if (frame.reliableIndex > (this.reliablePackets.size > 0 ? Math.max(...this.reliablePackets.keys()) : -1)) {
            this.reliablePackets.set(frame.reliableIndex, frame);
            this.processReliableFrames();
        }
    }

    private processReliableFrames(): void {
        const sortedReliableIndexes = Array.from(this.reliablePackets.keys()).sort((a, b) => a - b);
        for (const index of sortedReliableIndexes) {
            const frame = this.reliablePackets.get(index)!;
            this.processFrame(frame);
            this.reliablePackets.delete(index);
        }
    }

    private handleConnectedPing(buffer: Buffer): void {
        const packet = new ConnectedPing(buffer);
        const deserializedPacket = packet.deserialize();
            
        const pong = new ConnectedPong();
        pong.pingTimestamp = deserializedPacket.timestamp;
        pong.timestamp = BigInt(Date.now());

        const frame = new Frame();
        frame.reliability = Reliability.Unreliable;
        frame.orderChannel = 0;
        frame.payload = pong.serialize();
        
        this.raknet.queue.sendFrame(frame, Priority.Immediate);
    }

    private handleConnectionRequestAccepted(frame: Frame): void {
        const IncomingPacket = new ConnectionRequestAccepted(frame.payload);
        const des = IncomingPacket.deserialize();
        if (!des) {
            console.error('Failed to deserialize IncomingPacket!');
            return;
        }

        let packet = new OhMyNewIncommingConnection();
        packet.internalAddress = new Array<Address>()
        for (let i = 0; i < 10; i++) {
            packet.internalAddress[i] = new Address('0.0.0.0', 0, 4);
        }
        /** @ts-ignore */
        packet.serverAddress = new Address(des.address.address, des.address.port, 4);
        packet.incomingTimestamp = BigInt(Date.now());
        packet.serverTimestamp = des.timestamp; 

        const sendFrame = new Frame();
        sendFrame.reliability = Reliability.ReliableOrdered;
        sendFrame.orderChannel = 0;
        sendFrame.payload = packet.serialize();
        if (!frame.payload) {
            console.error('Failed to serialize the packet!');
            return;
        }

        this.raknet.queue.sendFrame(sendFrame, Priority.Immediate);
        void this.raknet.emit("connect", this);
    }

    private async handleGamePacket(buffer: Buffer): Promise<void> {
        let decrypted = buffer.subarray(1);
        if (_client.encryption) {
            try {decrypted = _encryptor.decryptPacket(decrypted)} catch(error) {
                //console.log(error)
                return;
            }
        }
        
        const algorithm: CompressionMethod = CompressionMethod[ decrypted[0] as number ]
                                                                ? decrypted.readUint8()
                                                                : CompressionMethod.NotPresent;

        if (algorithm !== CompressionMethod.NotPresent) decrypted = decrypted.subarray(1);
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
        try { frames = Framer.unframe(inflated) }  catch (error) {
            console.log("\n\n\nCAN NOT UNFRAME\n\n\n")
        }       
        if(!frames) return;
        for (const frame of frames) {
            const id = getPacketId(frame);
            const packet = Packets[id];
            if(!packet){
                Logger.warn("Packet with ID " + id + " not found");
                break;
            }
            Logger.debug(packet.name)
            if(packet.name == SetEntityDataPacket.name) return; // Is broken ig?
            const instance = new packet(frame).deserialize();
            let ignoreDebugPackets = [
                LevelChunkPacket.name,
                StartGamePacket.name
            ]
            if(!ignoreDebugPackets.includes(packet.name)) console.log(instance)
            _client.emit(Packets[id].name, instance);
        }
    }   

    private processFrame(frame: Frame): void {
        const header = (frame.payload[0] as number);
        //console.log(`Processing frame: ${header}`);
        switch (header) {
            case Packet.ConnectionRequestAccepted:
                this.handleConnectionRequestAccepted(frame);
                break;
            case GAME_BYTE:
                this.handleGamePacket(frame.payload);
                break;
            case Packet.ConnectedPing:
                this.handleConnectedPing(frame.payload);
                break;
            default:
                console.log(`Unknown frame: ${header}`);
                break;
        }
    }
}

