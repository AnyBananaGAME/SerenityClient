import EventEmitter from "events";
import { PlayerStatus } from "./client/PlayerStatus";
import { Options, defaultOptions } from "./client/ClientOptions"
import { Network, NetworkSession } from "@serenityjs/network";
import { Connection, Server } from "@serenityjs/raknet";
import RakNetClient from "./client/RaknetClient";

class Client extends EventEmitter {
	public readonly username: string;
	public readonly xuid: string;
	public readonly uuid: string;
	public status: PlayerStatus = PlayerStatus.Connecting;
    public readonly sendQ = []; 
    public readonly options: Options = defaultOptions;
    public readonly raknet: RakNetClient;
    public readonly protocol: number = 685;
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

    }

    connect(){
        this.raknet.connect();
    }

    disconnect(){
        process.exit(0)
    }

}

export default Client;