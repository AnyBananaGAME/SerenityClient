import EventEmitter from "events";
import { PlayerStatus } from "./client/PlayerStatus";
import { Options, defaultOptions } from "./client/ClientOptions"
import { GAME_BYTE, Network, NetworkSession } from "@serenityjs/network";
import { Connection, Frame, Priority, Reliability, Server } from "@serenityjs/raknet";
import RakNetClient from "./client/RaknetClient";
import { CompressionMethod, DataPacket, Framer, LoginPacket, LoginTokens, RequestNetworkSettingsPacket } from "@serenityjs/protocol";
import { KeyPairKeyObjectResult } from "crypto";
import { deflateRawSync } from "zlib";

class Client extends EventEmitter {
	public readonly username: string;
	public readonly xuid: string;
	public readonly uuid: string;
	public status: PlayerStatus = PlayerStatus.Connecting;
    public readonly sendQ = []; 
    public readonly options: Options = defaultOptions;
    public readonly raknet: RakNetClient;
    public readonly protocol: number = 685;

    /** @ts-ignore */
    public publicKeyDER: string | Buffer;
    /** @ts-ignore */
    public privateKeyPEM: string | Buffer;
    /** @ts-ignore */
    public clientX509: string;    
    /** @ts-ignore */
    public ecdhKeyPair: KeyPairKeyObjectResult;
    /** @ts-ignore */
    public secretKeyBytes: Buffer;
    /** @ts-ignore */
    public sharedSecret: Buffer;

    constructor(options: Options = {}) {
        super();
        

        this.options = {...defaultOptions,  ...options };        
        if(!this.options.host) throw new Error("Host cannot be undefined");
        if(!this.options.port) throw new Error("Port cannot be undefined");

        this.raknet = new RakNetClient(this.options.host, this.options.port, this);
        this.raknet.on("packet", (packet) => {
            console.log(packet);
        });

        this.username = "";
        this.xuid = "";
        this.uuid = ""; 
        this.handlePackets();

    }

    connect(){
        this.raknet.connect();
    }

    disconnect(){
        process.exit(0)
    }
    
    sendPackets(priority: Priority | null, ...packets: Array<DataPacket>){
        if(priority === null) priority = Priority.Normal;
        const payloads: Array<Buffer> = [];

        for (const packet of packets) {
            const serialized = packet.serialize()
            payloads.push(serialized);
        }

        const framed = Framer.frame(...payloads);

        const deflated =
        framed.byteLength > 256 && true
            ? Buffer.from([CompressionMethod.Zlib, ...deflateRawSync(framed)])
            : true
                ? Buffer.from([CompressionMethod.None, ...framed])
                : framed;
        const encrypted = deflated;

        const payload = Buffer.concat([Buffer.from([GAME_BYTE]), encrypted]);

        const frame = new Frame();
        frame.reliability = Reliability.ReliableOrdered;
        frame.orderChannel = 0;
        frame.payload = payload;  
        this.raknet.queue.sendFrame(frame, priority) 
    }

    sendPacket(packet: DataPacket, priority: Priority = Priority.Normal){
        const serialized = packet.serialize()
        const framed = Framer.frame(serialized);
        const deflated =
        framed.byteLength > 256 && true
            ? Buffer.from([CompressionMethod.Zlib, ...deflateRawSync(framed)])
            : true
                ? Buffer.from([CompressionMethod.None, ...framed])
                : framed;
        const encrypted = deflated;
        const payload = Buffer.concat([Buffer.from([GAME_BYTE]), encrypted]);
        
        const frame = new Frame();
        frame.reliability = Reliability.ReliableOrdered;
        frame.orderChannel = 0;
        frame.payload = payload;  
        this.raknet.queue.sendFrame(frame, priority) 
    }


    handlePackets(){
        this.raknet.on("connect", () => {
            console.log("Connected")
            const networksettings = new RequestNetworkSettingsPacket();
            networksettings.protocol = this.protocol;
            const packets: Array<DataPacket> = [];
            packets[0] = networksettings;
            this.sendPacket( networksettings, Priority.Immediate);
        })
    }
}

export default Client;