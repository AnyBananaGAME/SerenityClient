import { Server } from "@serenityjs/raknet";
import Client from "./src/Client";

async function a(){
   /*
    const server = new Server("127.0.0.1", 19132);
    server.on("connect", () => console.log("Connected!"));
    server.on("disconnect", () => console.log("Disconnected!"))
    await server.start();
    server.socket.on("message", (msg, rinfo) => {
        if(msg.length != 33) console.log(msg, rinfo)
    })
   */
    setTimeout(async () => {
        console.log("[Client] " + new Date().toLocaleDateString())
        const client = new Client({host: "127.0.0.1", port: 19132});
        //await client.raknet.ping();
        await client.connect();
    }, 1000)
}
a()