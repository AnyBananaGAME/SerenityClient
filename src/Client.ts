import EventEmitter from "events";
import { PlayerStatus } from "./client/PlayerStatus";
import { Options, defaultOptions } from "./client/ClientOptions"
import { GAME_BYTE } from "@serenityjs/network";
import { Frame, Priority, Reliability } from "@serenityjs/raknet";
import RakNetClient, { Advertisement } from "./client/RaknetClient";
import { CompressionMethod, DataPacket, Framer, NetworkSettingsPacket, RequestNetworkSettingsPacket } from "@serenityjs/protocol";
import { createCipher, createHash, KeyPairKeyObjectResult, publicEncrypt } from "crypto";
import { deflateRawSync } from "zlib";
import { authenticate } from "./client/auth/Auth";
import { PacketHandler } from "./handlers/index";
import { ClientData } from "./client/ClientData";
import { PacketEncryptor } from "./packets/PacketEncryptor";

declare global {
    var _client: Client;
    var _encryptor: PacketEncryptor;
}

class Client extends EventEmitter {
    public static debug: boolean = true;
    public readonly username: string;
    public readonly xuid: string;
    public readonly uuid: string;
    public status: PlayerStatus = PlayerStatus.Connecting;
    public readonly sendQ = [];
    public readonly options: Options = defaultOptions;
    public readonly raknet: RakNetClient;
    public readonly protocol: number = 685;
    public packetHandler: PacketHandler;

    /** @ts-ignore */
    public publicKeyDER: string | Buffer;
    /** @ts-ignore */
    public privateKeyPEM: string | Buffer;
    /** @ts-ignore */
    public ecdhKeyPair: KeyPairKeyObjectResult;
    /** @ts-ignore */
    public secretKeyBytes: Buffer;
    /** @ts-ignore */
    public sharedSecret: Buffer;
    /** @ts-ignore */
    public profile: { name: string, xuid: string, uuid: string };
    public accessToken: string = "";
    public iOiiO = false;

    public serverName: string = "unknown";
    public data: ClientData;
    public encryption: boolean = false;
    public compressionThreshold: number = 1;

    public runtimeEntityId: bigint = 0n;

    constructor(options: Options = {}) {
        super();
        this.options = { ...defaultOptions, ...options };
        if (!this.options.host) throw new Error("Host cannot be undefined");
        if (!this.options.port) throw new Error("Port cannot be undefined");
        globalThis._client = this;

        this.data = new ClientData(this);
        this.raknet = new RakNetClient(this.options.host, this.options.port, this);
        this.packetHandler = new PacketHandler(this);

        this.username = "";
        this.xuid = "";
        this.uuid = "";
        this.handlePackets();


    }

    connect() {
        if (this.options.offline) {
            //auth.createOfflineSession(this, this.options)
        } else {
            authenticate(this).then(i => {
                this.profile = i.profile;
                this.accessToken = i.chains;
                this.data.loginData.clientIdentityChain = this.data.createClientChain(null, this.options.offline ?? false)
                this.data.loginData.clientUserChain = this.data.createClientUserChain(this.data.loginData.ecdhKeyPair.privateKey);
                this.emit("session")
            })
        }
        this.on("session", async () => {
            const ping = await this.ping() as Advertisement;
            this.serverName = ping.serverName;
            console.log(this.serverName)
            this.raknet.connect();
        })
    }

    async ping() {
        return await this.raknet.ping();
    }

    disconnect(reason: string) {
        console.log(reason)
        process.exit(0)
    }

    sendPackets(priority: Priority | null, ...packets: Array<DataPacket>) {
        if (priority === null) priority = Priority.Normal;
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
    


    sendPacket(packet: DataPacket, priority: Priority = Priority.Normal) {
        const id = packet.getId().toString(16).padStart(2, '0');
        const date = new Date();
        if(Client.debug) console.log(`[debug] Sending a Game PACKET  --> ${packet.getId()}  |  0x${id} ${date.toTimeString().split(' ')[0]}.${date.getMilliseconds().toString().padStart(3, '0')}`);
        const serialized = packet.serialize();

        let framed = Buffer.alloc(0)
        framed = Framer.frame(serialized);

        if(this.encryption){        
            const encryptedFrame = _encryptor.encryptPacket(framed, priority);
            this.raknet.queue.sendFrame(encryptedFrame, priority);
        } else {
            let payload;
            if (!this.iOiiO) {
                payload = Buffer.concat([Buffer.from([GAME_BYTE]), framed]);
            } else {
                let deflated; 
                if (framed.byteLength > 256) {
                    deflated = Buffer.from([CompressionMethod.Zlib, ...deflateRawSync(framed)]);
                } else {
                    deflated = Buffer.from([CompressionMethod.None, ...framed]);
                }
                console.log("Compression applied");
                payload = Buffer.concat([Buffer.from([GAME_BYTE]), deflated]);
            }
            
            console.log("Payload length:", payload.length);
            console.log("First few bytes:", payload.slice(0, 10).toString('hex'));
                        
            const frame = new Frame();
            frame.reliability = Reliability.ReliableOrdered;
            frame.orderChannel = 0;
            frame.payload = payload;
           
           
            this.raknet.queue.sendFrame(frame, priority);
        
        }   
    }

    handlePackets() {
        this.raknet.on("connect", () => {
            console.log("Sending RequestNetworkSettingsPacket")
            console.log(this.protocol)
            const networksettings = new RequestNetworkSettingsPacket();
            networksettings.protocol = this.protocol;
            this.sendPacket(networksettings, Priority.Immediate);
        });
    }


    public get clientX509():string {
        return this.data.loginData.clientX509;
    }

    encodeLoginJWT(localChain: any, mojangChain: any) { };
    decodeLoginJWT(authTokens: any, skinTokens: any) { };
    public isPMMP(): boolean { return this.serverName == "PocketMine-MP" }
}

export default Client;