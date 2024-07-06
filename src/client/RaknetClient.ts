import { EventEmitter } from 'events';
import * as dgram from 'dgram';
import { Address, ConnectionRequest, Magic, OpenConnectionReply1, OpenConnectionReply2, OpenConnectionRequest1, OpenConnectionRequest2, Packet, UnconnectedPong } from '@serenityjs/raknet';
import Client from '../Client';
import { BinaryStream } from '@serenityjs/binarystream';
import { randomBytes } from 'crypto';
import { PacketHandler } from './PacketHandler';
import { Queue } from './Queue';


type MCV = 'MCPE' | 'MCEE';

interface Advertisement {
	MinecraftVersion: MCV;
	serverMessage: string;
	protocol: number;
	version: string;
	playerCount: number;
	maxPlayers: number;
	serverGUID: number;
	serverName: string;
	gameMode: string;
	gameModeNum: number;
	serverPort: number;
	serverPortv6: number;
}
export {Advertisement}
class RakNetClient extends EventEmitter {
  public socket: dgram.Socket;
  public serverAddress: string;
  public serverPort: number;
  public connected: boolean = false;
  public client: Client;
  public protocol: number = 11;
  public id: bigint;
  private packetHandler: PacketHandler;
  private isBusy: boolean = false;
  public queue: Queue;

  constructor(serverAddress: string, serverPort: number, client: Client) {
    super();
    this.serverAddress = serverAddress;
    this.serverPort = serverPort;
    this.socket = dgram.createSocket('udp4');
    this.connected = false;
    this.client = client;
    this.id = BigInt(Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join(''));
    this.packetHandler = new PacketHandler(this);
	this.queue = new Queue(this);

    setInterval(() => {
	//	this.queue.sendFrameQueue();
	}, 50);
  }

  async connect() {
    console.log('RakNet client connecting to', this.serverAddress, 'on port', this.serverPort);
    await this.ping();
    await this.socket.on('message', (msg, rinfo) => { this.packetHandler.handleIncoming(msg) });
    await this.packetHandler.sendConnectionPacket();
  }

  close() {
    this.socket.close();
  }

  public async ping(){
    return new Promise((resolve, reject) => {
		  const timeout = setTimeout(() => {
				this.socket.removeListener('message', messageHandler);
				this.isBusy = false;
				reject(new Error('Timeout waiting for UnconnectedPong'));
			}, 5000);
			const messageHandler = (msg: Buffer, rinfo: dgram.RemoteInfo) => {
				const stream = BinaryStream.fromBuffer(msg);
				const packetId = stream.readUint8();
				if (packetId === Packet.UnconnectedPong) {
					const pongPacket = new UnconnectedPong(msg);
					pongPacket.deserialize();

					const advertisementData = pongPacket.message.split(';');
					const advertisement: Advertisement = {
						MinecraftVersion: advertisementData[0] as MCV,
						serverMessage: advertisementData[1],
						protocol: parseInt(advertisementData[2]),
						version: advertisementData[3],
						playerCount: parseInt(advertisementData[4]),
						maxPlayers: parseInt(advertisementData[5]),
						serverGUID: parseInt(advertisementData[6]),
						serverName: advertisementData[7],
						gameMode: advertisementData[8],
						gameModeNum: parseInt(advertisementData[9]),
						serverPort: parseInt(advertisementData[10]),
						serverPortv6: parseInt(advertisementData[11]),
					};

					clearTimeout(timeout);
					this.socket.removeListener('message', messageHandler);
					this.isBusy = false;
					resolve(advertisement);
				}
			};
			this.socket.on('message', messageHandler);
			this.packetHandler.sendUnconnectedPing();
      });
  }
  public getFrameHandler() {
    return this.packetHandler.framehandler;
  }

  send(packet: Buffer) {
    this.socket.send(packet, 0, packet.length, this.serverPort, this.serverAddress, (err) => {
      if (err) {
        console.error('Error sending packet:', err);
      }
    });
  }
}



export default RakNetClient;
