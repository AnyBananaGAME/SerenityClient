import { ResourcePackClientResponsePacket, ResourcePackResponse, ResourcePacksInfoPacket } from "@serenityjs/protocol";
import { BaseHandler } from "../BaseHandler";
import { Priority } from "@serenityjs/raknet";

class ResourcePacksInfoHandler extends BaseHandler {
    public name: string = ResourcePacksInfoPacket.name;

    public handle(packet: ResourcePacksInfoPacket) {
        let response = new ResourcePackClientResponsePacket();
        response.response = ResourcePackResponse.Completed;
        response.packs = [];
        _client.sendPacket(response, Priority.Immediate);
    }
}

export { ResourcePacksInfoHandler }