import { Frame, FrameSet, Priority, Reliability } from '@serenityjs/raknet';
import RakNetClient from './RaknetClient';

export class Queue {
	public outputBackupQueue = new Map<number, Array<Frame>>();
	public outputOrderIndex: Array<number>;
	public outputSequenceIndex: Array<number>;
	public outputFrameQueue: FrameSet;
	public outputSequence = 0;
	public outputReliableIndex = 0;
	public outputFragmentIndex = 0;
	public mtu: number = 1492;

	constructor(private client: RakNetClient) {
		this.outputFrameQueue = new FrameSet();
		this.outputFrameQueue.frames = [];
		this.outputOrderIndex = Array.from<number>({ length: 32 }).fill(0);
		this.outputSequenceIndex = Array.from<number>({ length: 32 }).fill(0);
	}

	/**
	 * Sends a frame to the connection.
	 *
	 * @param frame - The frame to send
	 * @param priority - The priority of the frame
	 */
	public sendFrame(frame: Frame, priority: Priority): void {
		if (frame.isSequenced()) {
			frame.orderIndex = this.outputOrderIndex[frame.orderChannel] as number;
			frame.sequenceIndex = (this.outputSequenceIndex[frame.orderChannel] as number)++;
		} else if (frame.isOrderExclusive()) {
			// Set the order index and the sequence index
			frame.orderIndex = (this.outputOrderIndex[frame.orderChannel] as number)++;
			this.outputSequenceIndex[frame.orderChannel] = 0;
		}

		// Set the reliable index
		frame.reliableIndex = this.outputReliableIndex++;

		// Split packet if bigger than MTU size
		const maxSize = this.mtu - 6 - 23;
		if (frame.payload.byteLength > maxSize) {
			// Create a new buffer from the payload and generate a fragment id
			const buffer = Buffer.from(frame.payload);
			const fragmentId = this.outputFragmentIndex++ % 65_536;

			// Loop through the buffer and split it into fragments based on the MTU size
			for (let index = 0; index < buffer.byteLength; index += maxSize) {
				// Check if the index is not 0, if so, set the reliable index
				if (index !== 0) frame.reliableIndex = this.outputReliableIndex++;

				// Create a new frame and assign the values
				frame.payload = buffer.subarray(index, index + maxSize);
				frame.fragmentIndex = index / maxSize;
				frame.fragmentId = fragmentId;
				frame.fragmentSize = Math.ceil(buffer.byteLength / maxSize);

				// Add the frame to the queue
				this.addFrameToQueue(frame, priority || Priority.Normal);
			}
		} else {
			return this.addFrameToQueue(frame, priority);
		}
	}

	private addFrameToQueue(frame: Frame, priority: Priority): void {
		let length = 4;
		// Add the length of the frame to the length
		for (const queuedFrame of this.outputFrameQueue.frames) {
			length += queuedFrame.getByteLength();
		}

		// Check if the frame is bigger than the MTU, if so, send the queue
		if (length + frame.getByteLength() > this.mtu - 36) {
			this.sendFrameQueue();
		}

		// Add the frame to the queue
		this.outputFrameQueue.frames.push(frame);

		// If the priority is immediate, send the queue
		if (priority === Priority.Immediate) return this.sendFrameQueue();
	}

	/**
	 * Sends the output frame queue
	 */
	public sendFrameQueue(): void {
		// Check if the queue is empty
		if (this.outputFrameQueue.frames.length > 0) {
			// Set the sequence of the frame set
			this.outputFrameQueue.sequence = this.outputSequence++;

			// Send the frame set
			this.sendFrameSet(this.outputFrameQueue);

			// Set the queue to a new frame set
			this.outputFrameQueue = new FrameSet();
			this.outputFrameQueue.frames = [];
		}
	}

	/**
	 * Sends a frame set to the connection
	 * @param frameset The frame set
	 */
	private sendFrameSet(frameset: FrameSet): void {
        this.client.send(frameset.serialize());

		frameset.frames.forEach((frame) => {
			console.log("Sending Header " + frame.payload[0]) 
		})
		this.outputBackupQueue.set(
			frameset.sequence,
			frameset.frames.filter((frame) => frame.isReliable()),
		);
	}
}
