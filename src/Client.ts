import EventEmitter from "events";
import { PlayerStatus } from "./client/PlayerStatus";
import { Options, defaultOptions } from "./client/ClientOptions"
import { Network, NetworkSession } from "@serenityjs/network";
import { Connection, Frame, Priority, Reliability, Server } from "@serenityjs/raknet";
import RakNetClient from "./client/RaknetClient";
import { DataPacket, LoginPacket, LoginTokens, RequestNetworkSettingsPacket } from "@serenityjs/protocol";
import { KeyPairKeyObjectResult } from "crypto";

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
    
    sendPacket(packet: DataPacket, priority: Priority = Priority.Normal){
        let frame = new Frame();
        frame.reliability = Reliability.ReliableOrdered;
        frame.orderChannel = 0;
        frame.payload = packet.serialize();   
        this.raknet.queue.sendFrame(frame, priority) 
    }

    handlePackets(){
        this.raknet.on("connect", () => {
            console.log("Connected")
            const networksettings = new RequestNetworkSettingsPacket();
            networksettings.protocol = this.protocol;
            this.sendPacket(networksettings, Priority.Immediate);
        })
    }
}

export default Client;