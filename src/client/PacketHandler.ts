import { Ack, Address, Frame, Nack, OpenConnectionReply1, OpenConnectionRequest1, OpenConnectionRequest2, Packet, Priority, Reliability, UnconnectedPing } from "@serenityjs/raknet";
import RakNetClient from "./RaknetClient";
import { FrameHandler } from "./FrameHandler";
import { NewConnectionRequest } from "../packets/raknet/NewConnectionRequest";
import Client from "../Client";

const magic = Buffer.from('00ffff00fefefefefdfdfdfd12345678', 'hex');

export  class PacketHandler {
    public framehandler: FrameHandler;

	constructor(private client: RakNetClient) {
        this.framehandler = new FrameHandler(this.client);
    }

    public handleIncoming(buffer: Buffer){
        const packetId = buffer.readUint8();
        let ignore = [132, 192, 128]
        if(!ignore.includes(packetId)) console.info('Received packet ', packetId);

        switch (packetId) {
            case 254:
                process.exit(0);
                break;
            case Packet.OpenConnectionReply1:
                this.handleOpenConnectionRequest2(buffer);
                break;
            case Packet.OpenConnectionReply2:
                this.handleOpenConnectionRequest(buffer);
                break;
            case Packet.Ack:
                const ack = new Ack(buffer).deserialize();
                //console.log(ack)
                break;
            case Packet.Nack:
                const pak = new Nack(buffer).deserialize();
                console.log(pak)
                break;
            case 128:
            case 129:
            case 130: 
            case 131:
            case 132:
            case 134:
            case 135:
            case 136:
            case 137:
            case 138:
            case 139:
            case 140:
            case 141:
                this.framehandler.handleFrameSet(buffer);
                break;
            default:
                console.info('Received unknown packet ', packetId);
        }
    }


    public handleOpenConnectionRequest2(buffer: Buffer){
        const reply2 = new OpenConnectionReply1(buffer).deserialize();
        const pak = new OpenConnectionRequest2();
        pak.mtu = 1492;
        pak.client = this.client.id;
        pak.magic = reply2.magic;
        pak.address = new Address(this.client.socket.address().address, this.client.socket.address().port, 4);
        this.client.send(pak.serialize())
    }

    public handleOpenConnectionRequest(buffer: Buffer){
        //console.log(new OpenConnectionReply2(buffer).deserialize())
        const date = new Date();
        const packet = new NewConnectionRequest();
		packet.client = BigInt(this.client.id);
		packet.timestamp = BigInt(Date.now());
        packet.security = false;
		const frame = new Frame();
		frame.reliability = Reliability.Reliable;
		frame.orderChannel = 0;
		frame.payload = packet.serialize();
		this.client.queue.sendFrame(frame, Priority.Immediate);
    }



    public sendConnectionPacket() {
        const packet = new OpenConnectionRequest1();
        packet.magic = Buffer.from(
            "\0\xFF\xFF\0\xFE\xFE\xFE\xFE\xFD\xFD\xFD\xFD4Vx",
            "binary"
        );
        packet.protocol = this.client.protocol;
        packet.mtu = 1464;
    
        const serializedPacket = packet.serialize(); 
        this.client.send(serializedPacket);
    }

    public sendUnconnectedPing(){
        const packet = new UnconnectedPing();
        packet.timestamp = BigInt(Date.now());
        packet.magic = magic;
        packet.client = BigInt(this.client.id);
        this.client.send(packet.serialize());
        if(Client.debug) console.log('[debug] Sending UnconnectedPing.')
    }

}
