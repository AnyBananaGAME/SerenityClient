import { DataPacket, Packet } from "@serenityjs/protocol";

import { Proto } from "../proto";
import { Serialize } from "../serialize";
import { VarString } from "@serenityjs/binarystream";

@Proto(0x04)
class ClientToServerHandshakePacket extends DataPacket {}

export { ClientToServerHandshakePacket }