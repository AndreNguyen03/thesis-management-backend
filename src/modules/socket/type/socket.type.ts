import { Socket } from "socket.io";
import { ActiveUserData } from "../../../auth/interface/active-user-data.interface";
import { Request } from "express";
export interface AuthPayload {
    payload: ActiveUserData
}
export type SocketWithAuth = Socket & AuthPayload
export type RequestAuthPayload = Request & AuthPayload