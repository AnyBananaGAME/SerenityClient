import { Authflow, Titles } from "prismarine-auth";
import Client from "../../Client";

async function authenticate (client: Client) {
    try {
    const authflow = new Authflow("AnyBananaGAME", "./tokens/", { 
        authTitle: Titles.MinecraftNintendoSwitch, 
        flow: "live",
        deviceType: 'Nintendo'
    }, console.log);
    
    /** @ts-ignore */
    const chains = await authflow.getMinecraftBedrockToken(client.data.loginData.clientX509).catch(e => {
      console.log("Error whilw getting Chains! " + client.data.loginData.clientX509);
      throw e
    });

    const jwt = chains[1]
    const [header, payload, signature] = jwt.split('.').map(k => Buffer.from(k, 'base64')) // eslint-disable-line
    const xboxProfile = JSON.parse(String(payload))

    const profile = {
      name: xboxProfile?.extraData?.displayName || 'Player',
      uuid: xboxProfile?.extraData?.identity || 'adfcf5ca-206c-404a-aec4-f59fff264c9b', // random
      xuid: xboxProfile?.extraData?.XUID || 0
    }
    

    return {profile: profile, chains: chains};
    } catch (err) {
        console.error(err)
        client.emit('error', err)
        return { profile: {name: "any", uuid: "any", xuid: "any"}, chains: "" };
  }
}

export {authenticate}