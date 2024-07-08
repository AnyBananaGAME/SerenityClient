import "reflect-metadata"
import Client from "./src/Client";
import { DisconnectPacket } from "@serenityjs/protocol";
import RakNetClient from "./src/client/RaknetClient";


async function a(){
    setTimeout(async () => {
        console.log("[Client] " + new Date().toLocaleDateString())
        const client = new Client({host: "127.0.0.1", port: 19132});
        client.on(DisconnectPacket.name, (packet: DisconnectPacket) => {
            console.log(packet);
            setTimeout(async () => {
                process.exit()
            }, 1000)
        })
        await client.connect();
    }, 1000)
}
a()

export { Client, RakNetClient } 