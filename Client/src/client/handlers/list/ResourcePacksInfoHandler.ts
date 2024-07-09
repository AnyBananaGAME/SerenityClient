import { ResourcePackClientResponsePacket, ResourcePackResponse, ResourcePacksInfoPacket, TextPacket, TextPacketType } from "@serenityjs/protocol";
import { BaseHandler } from "../BaseHandler";
import { Priority } from "@serenityjs/raknet";
import Logger from "../../../utils/Logger";

class ResourcePacksInfoHandler extends BaseHandler {
    public name: string = ResourcePacksInfoPacket.name;

    public handle(packet: ResourcePacksInfoPacket) {
        if(packet.texturePacks.length !== 0){
            Logger.debug("Texture Pack Length is not 0!")
        };
        
        const response = new ResourcePackClientResponsePacket();
        response.response = ResourcePackResponse.Completed;
        response.packs = [];
        _client.sendPacket(response, Priority.Immediate);

        
        
    
        setInterval(() => {
            const Text = new TextPacket()
            Text.filtered = "";
            Text.message = ` ${new Date().toLocaleDateString() } `
            Text.needsTranslation = false;
            Text.parameters = [];
            Text.platformChatId = "";
            Text.source = _client.data.profile.name;
            Text.type = TextPacketType.Chat;
            Text.xuid = "";
            _client.sendPacket(Text, Priority.Immediate);
            
        }, 10000);

    }
}

export { ResourcePacksInfoHandler }