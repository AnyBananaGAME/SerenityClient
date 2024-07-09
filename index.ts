import "reflect-metadata"
import { DisconnectPacket } from "@serenityjs/protocol";
import Client from "./Client/Client";
import { Logger } from "./Raknet";


async function a(){
    Logger.info("[Client] " + new Date().toLocaleDateString())
    const client = new Client({host: "127.0.0.1", port: 19132, debug: false});
    client.on(DisconnectPacket.name, (packet: DisconnectPacket) => {
        console.log(packet);
        setTimeout(async () => {
            process.exit()
        }, 1000)
    })
    await client.connect();
}
a()

