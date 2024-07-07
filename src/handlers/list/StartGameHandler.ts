import { RequestChunkRadiusPacket, RespawnPacket, RespawnState, StartGamePacket, Vector3f } from "@serenityjs/protocol";
import { BaseHandler } from "../BaseHandler";

class StartGameHandler extends BaseHandler {
    public name: string = StartGamePacket.name;

    public handle(packet: StartGamePacket){
        const radius = new RequestChunkRadiusPacket();
        radius.radius = 12;
        radius.maxRadius = 12;
        
        _client.sendPacket(radius);
        const respawn = new RespawnPacket()
        respawn.position = new Vector3f(packet.spawnPosition.x, packet.spawnPosition.y, packet.spawnPosition.z);
        respawn.runtimeEntityId = packet.runtimeEntityId;
        respawn.state = RespawnState.ClientReadyToSpawn;
        
        //_client.sendPacket(respawn)
    }
}

export default StartGameHandler;