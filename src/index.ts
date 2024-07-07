import "reflect-metadata"
import { Server } from "@serenityjs/raknet";
import Client from "./Client";
import { DisconnectPacket, DisconnectReason } from "@serenityjs/protocol";
import Logger from "./utils/Logger";

async function a(){
    let consoleDebug = true;
    setTimeout(async () => {
        Logger.info("[Client] Starting")
        const client = new Client({host: "127.0.0.1", port: 19132});
        client.on(DisconnectPacket.name, (packet: DisconnectPacket) => {
            Logger.debug(packet)
            setTimeout(async () => {
                process.exit()
            }, 1000)
        })
        //await client.raknet.ping();
        await client.connect();
    }, 1000)
}
a()

/**
 * 
 * EXTRA FILE
 * FOR SWC PURPOSES
 * 
 * 
 */