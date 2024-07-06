import { NetworkSettingsPacket } from "@serenityjs/protocol";
import { BaseHandler } from "../BaseHandler";
import { Priority } from "@serenityjs/raknet";
import { LoginPacket, LoginTokens } from "../../packets/game/LoginPacket";
import { SignOptions } from "jsonwebtoken";
import { KeyObject } from "crypto";
import Client from "../../Client";


class NetworkSettingsHandler extends BaseHandler {
    public name: string = NetworkSettingsPacket.name;

    handle(packet: NetworkSettingsPacket): void {
        if(Client.debug) console.log("[debug] S -> C NetworkSettingsPacket");
        _client.iOiiO = true;
        _client.compressionThreshold = packet.compressionThreshold;
        const chain = [_client.data.loginData.clientIdentityChain, ..._client.accessToken];
        let userChain = _client.data.loginData.clientUserChain;
        const encodedChain = JSON.stringify({ chain });

        const login = new LoginPacket();
        login.protocol = _client.protocol;
        login.tokens = new LoginTokens(userChain, encodedChain);

        _client.sendPacket(login, Priority.Immediate);
    }




}

export { NetworkSettingsHandler };