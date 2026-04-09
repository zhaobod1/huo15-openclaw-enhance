import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
import { type ExecApprovalRequest, type ExecApprovalResolved } from "openclaw/plugin-sdk/infra-runtime";
import { deleteMatrixMessage, editMatrixMessage } from "./matrix/actions/messages.js";
import { repairMatrixDirectRooms } from "./matrix/direct-management.js";
import type { MatrixClient } from "./matrix/sdk.js";
import { reactMatrixMessage, sendMessageMatrix } from "./matrix/send.js";
type ApprovalRequest = ExecApprovalRequest;
type ApprovalResolved = ExecApprovalResolved;
export type MatrixExecApprovalHandlerOpts = {
    client: MatrixClient;
    accountId: string;
    cfg: OpenClawConfig;
    gatewayUrl?: string;
};
export type MatrixExecApprovalHandlerDeps = {
    nowMs?: () => number;
    sendMessage?: typeof sendMessageMatrix;
    reactMessage?: typeof reactMatrixMessage;
    editMessage?: typeof editMatrixMessage;
    deleteMessage?: typeof deleteMatrixMessage;
    repairDirectRooms?: typeof repairMatrixDirectRooms;
};
export declare class MatrixExecApprovalHandler {
    private readonly opts;
    private readonly runtime;
    private readonly trackedReactionTargets;
    private readonly nowMs;
    private readonly sendMessage;
    private readonly reactMessage;
    private readonly editMessage;
    private readonly deleteMessage;
    private readonly repairDirectRooms;
    constructor(opts: MatrixExecApprovalHandlerOpts, deps?: MatrixExecApprovalHandlerDeps);
    start(): Promise<void>;
    stop(): Promise<void>;
    handleRequested(request: ApprovalRequest): Promise<void>;
    handleResolved(resolved: ApprovalResolved): Promise<void>;
    private prepareTarget;
    private finalizeResolved;
    private clearPending;
    private trackReactionTarget;
    private untrackReactionTarget;
    private clearTrackedReactionTargets;
}
export {};
