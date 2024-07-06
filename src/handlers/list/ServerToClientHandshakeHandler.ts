import { Packet, Packets, ServerToClientHandshakePacket } from "@serenityjs/protocol";
import { BaseHandler } from "../BaseHandler";
import { ClientToServerHandshakePacket } from "../../packets/game/ClientToServerHandshakePacket";
import { Priority } from "@serenityjs/raknet";
import * as JWT from "jsonwebtoken";
import { createHash, createPublicKey, diffieHellman, KeyExportOptions } from "crypto";
import { PacketEncryptor } from "../../PacketEncryptor";

const SALT = '🧂'
const pem:  KeyExportOptions<"pem"> = { format: 'pem', type: 'sec1' };
const der:  KeyExportOptions<"der"> = { format: 'der', type: 'spki' };

class ServerToClientHandshakeHandler extends BaseHandler {
    public name: string = ServerToClientHandshakePacket.name;

    handle(packet: ServerToClientHandshakePacket){
        console.log("ServerToClientHandshakePacket Handler")
        console.log(packet);
        const { clientX509, ecdhKeyPair } = _client.data.loginData;
        let jwt = packet.token;

        const [header, payload] = jwt.split('.').map(k => Buffer.from(k, 'base64'))
        const head = JSON.parse(String(header))
        const body = JSON.parse(String(payload))
        //@ts-ignore
        const pubKeyDer = createPublicKey({ key: Buffer.from(head.x5u, 'base64'), ...der })
        _client.sharedSecret = diffieHellman({ privateKey: ecdhKeyPair.privateKey, publicKey: pubKeyDer })

        const salt = Buffer.from(body.salt, 'base64')
        const secretHash = createHash('sha256')
        secretHash.update(salt)
        secretHash.update(_client.sharedSecret)

        _client.secretKeyBytes = secretHash.digest()
        const iv = _client.secretKeyBytes.slice(0, 16);
        _client.data.iv = iv;
        globalThis._encryptor = new PacketEncryptor(_client.secretKeyBytes);
        _client.encryption = true;

        const handshake = new ClientToServerHandshakePacket();
        _client.sendPacket(handshake, Priority.Immediate);
    }

}

function toBase64 (string: string) {
    return Buffer.from(string).toString('base64')
}
  

export { ServerToClientHandshakeHandler }