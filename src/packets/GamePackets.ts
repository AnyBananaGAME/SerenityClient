// Import the packet classes
import {
    LoginPacket,
    PlayStatusPacket,
    ServerToClientHandshakePacket,
    DisconnectPacket,
    ResourcePacksInfoPacket,
    ResourcePackStackPacket,
    ResourcePackClientResponsePacket,
    TextPacket,
    SetTimePacket,
    StartGamePacket,
    AddPlayerPacket,
    AddEntityPacket,
    RemoveEntityPacket,
    AddItemActorPacket,
    TakeItemActorPacket,
    MoveActorAbsolutePacket,
    MovePlayerPacket,
    UpdateBlockPacket,
    LevelEventPacket,
    ActorEventPacket,
    UpdateAttributesPacket,
    InventoryTransactionPacket,
    MobEquipmentPacket,
    InteractPacket,
    BlockPickRequestPacket,
    PlayerActionPacket,
    SetEntityDataPacket,
    SetActorMotionPacket,
    AnimatePacket,
    RespawnPacket,
    ContainerOpenPacket,
    ContainerClosePacket,
    PlayerHotbarPacket,
    InventoryContentPacket,
    InventorySlotPacket,
    BlockActorDataPacket,
    LevelChunkPacket,
    SetCommandsEnabledPacket,
    ChangeDimensionPacket,
    SetPlayerGameTypePacket,
    PlayerListPacket,
    RequestChunkRadiusPacket,
    ChunkRadiusUpdatePacket,
    BossEventPacket,
    AvailableCommandsPacket,
    CommandRequestPacket,
    CommandOutputPacket,
    ResourcePackDataInfoPacket,
    ResourcePackChunkDataPacket,
    ResourcePackChunkRequestPacket,
    TransferPacket,
    SetTitlePacket,
    PlayerSkinPacket,
    ModalFormRequestPacket,
    ModalFormResponsePacket,
    RemoveObjectivePacket,
    SetDisplayObjectivePacket,
    SetScorePacket,
    SetScoreboardIdentityPacket,
    SetLocalPlayerAsInitializedPacket,
    NetworkStackLatencyPacket,
    NetworkChunkPublisherUpdatePacket,
    BiomeDefinitionListPacket,
    LevelSoundEventPacket,
    EmotePacket,
    NetworkSettingsPacket,
    PlayerAuthInputPacket,
    CreativeContentPacket,
    ItemStackRequestPacket,
    ItemStackResponsePacket,
    EmoteListPacket,
    PacketViolationWarningPacket,
    AnimateEntityPacket,
    ItemComponentPacket,
    NpcDialoguePacket,
    ScriptMessagePacket,
    ToastRequestPacket,
    UpdateAbilitiesPacket,
    UpdateAdventureSettingsPacket,
    RequestNetworkSettingsPacket,
    SetHudPacket,
    AwardAchievementPacket
} from "@serenityjs/protocol";
import { BasePacket } from "@serenityjs/raknet";

const GamePackets: Array<typeof BasePacket> = [];
GamePackets[0x01] = LoginPacket;
GamePackets[0x02] = PlayStatusPacket;
GamePackets[0x03] = ServerToClientHandshakePacket;
GamePackets[0x05] = DisconnectPacket;
GamePackets[0x06] = ResourcePacksInfoPacket;
GamePackets[0x07] = ResourcePackStackPacket;
GamePackets[0x08] = ResourcePackClientResponsePacket;
GamePackets[0x09] = TextPacket;
GamePackets[0x0a] = SetTimePacket;
GamePackets[0x0b] = StartGamePacket;
GamePackets[0x0c] = AddPlayerPacket;
GamePackets[0x0d] = AddEntityPacket;
GamePackets[0x0e] = RemoveEntityPacket;  
GamePackets[0x0f] = AddItemActorPacket;
GamePackets[0x11] = TakeItemActorPacket;
GamePackets[0x12] = MoveActorAbsolutePacket;
GamePackets[0x13] = MovePlayerPacket;
GamePackets[0x15] = UpdateBlockPacket;
GamePackets[0x19] = LevelEventPacket;
GamePackets[0x1b] = ActorEventPacket;
GamePackets[0x1d] = UpdateAttributesPacket;
GamePackets[0x1e] = InventoryTransactionPacket;
GamePackets[0x1f] = MobEquipmentPacket;
GamePackets[0x21] = InteractPacket;
GamePackets[0x22] = BlockPickRequestPacket;
GamePackets[0x24] = PlayerActionPacket;
GamePackets[0x27] = SetEntityDataPacket;
GamePackets[0x28] = SetActorMotionPacket;
GamePackets[0x2c] = AnimatePacket;
GamePackets[0x2d] = RespawnPacket;
GamePackets[0x2e] = ContainerOpenPacket;
GamePackets[0x2f] = ContainerClosePacket;
GamePackets[0x30] = PlayerHotbarPacket;
GamePackets[0x31] = InventoryContentPacket;
GamePackets[0x32] = InventorySlotPacket;
GamePackets[0x38] = BlockActorDataPacket;
GamePackets[0x3a] = LevelChunkPacket;
GamePackets[0x3b] = SetCommandsEnabledPacket;
GamePackets[0x3d] = ChangeDimensionPacket;
GamePackets[0x3e] = SetPlayerGameTypePacket;
GamePackets[0x3f] = PlayerListPacket;
GamePackets[0x45] = RequestChunkRadiusPacket;
GamePackets[0x46] = ChunkRadiusUpdatePacket;
GamePackets[0x4a] = BossEventPacket;
GamePackets[0x4c] = AvailableCommandsPacket;
GamePackets[0x4d] = CommandRequestPacket;
GamePackets[0x4f] = CommandOutputPacket;
GamePackets[0x52] = ResourcePackDataInfoPacket;
GamePackets[0x53] = ResourcePackChunkDataPacket;
GamePackets[0x54] = ResourcePackChunkRequestPacket;
GamePackets[0x55] = TransferPacket;
GamePackets[0x58] = SetTitlePacket;
GamePackets[0x5d] = PlayerSkinPacket;
GamePackets[0x64] = ModalFormRequestPacket;
GamePackets[0x65] = ModalFormResponsePacket;
GamePackets[0x6a] = RemoveObjectivePacket;
GamePackets[0x6b] = SetDisplayObjectivePacket;
GamePackets[0x6c] = SetScorePacket;
GamePackets[0x70] = SetScoreboardIdentityPacket;
GamePackets[0x71] = SetLocalPlayerAsInitializedPacket;
GamePackets[0x73] = NetworkStackLatencyPacket;
GamePackets[0x79] = NetworkChunkPublisherUpdatePacket;
GamePackets[0x7a] = BiomeDefinitionListPacket;
GamePackets[0x7b] = LevelSoundEventPacket;
GamePackets[0x8a] = EmotePacket;
GamePackets[0x8f] = NetworkSettingsPacket;
GamePackets[0x90] = PlayerAuthInputPacket;
GamePackets[0x91] = CreativeContentPacket;
GamePackets[0x93] = ItemStackRequestPacket;
GamePackets[0x94] = ItemStackResponsePacket;
GamePackets[0x98] = EmoteListPacket;
GamePackets[0x9c] = PacketViolationWarningPacket;
GamePackets[0x9e] = AnimateEntityPacket;
GamePackets[0xa2] = ItemComponentPacket;
GamePackets[0xa9] = NpcDialoguePacket;
GamePackets[0xb1] = ScriptMessagePacket;
GamePackets[0xba] = ToastRequestPacket;
GamePackets[0xbb] = UpdateAbilitiesPacket;
GamePackets[0xbc] = UpdateAdventureSettingsPacket;
GamePackets[0xc1] = RequestNetworkSettingsPacket;
GamePackets[0x134] = SetHudPacket;
GamePackets[0x135] = AwardAchievementPacket;

export default GamePackets;
