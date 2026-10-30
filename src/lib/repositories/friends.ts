/**
 * Public entry point for friends, friend codes and weekly boss damage. Picks the in-memory demo backend or the Supabase
 * backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/friends";
import * as supabase from "./supabase/friends";

const impl = () => (isDemoMode() ? memory : supabase);

export const getCard = (...args: Parameters<typeof memory.getCard>): ReturnType<typeof memory.getCard> => impl().getCard(...args);
export const createCard = (...args: Parameters<typeof memory.createCard>): ReturnType<typeof memory.createCard> => impl().createCard(...args);
export const updateCard = (...args: Parameters<typeof memory.updateCard>): ReturnType<typeof memory.updateCard> => impl().updateCard(...args);
export const findByCode = (...args: Parameters<typeof memory.findByCode>): ReturnType<typeof memory.findByCode> => impl().findByCode(...args);
export const listLinks = (...args: Parameters<typeof memory.listLinks>): ReturnType<typeof memory.listLinks> => impl().listLinks(...args);
export const createLink = (...args: Parameters<typeof memory.createLink>): ReturnType<typeof memory.createLink> => impl().createLink(...args);
export const acceptLink = (...args: Parameters<typeof memory.acceptLink>): ReturnType<typeof memory.acceptLink> => impl().acceptLink(...args);
export const removeLink = (...args: Parameters<typeof memory.removeLink>): ReturnType<typeof memory.removeLink> => impl().removeLink(...args);
export const saveDamage = (...args: Parameters<typeof memory.saveDamage>): ReturnType<typeof memory.saveDamage> => impl().saveDamage(...args);
export const listDamage = (...args: Parameters<typeof memory.listDamage>): ReturnType<typeof memory.listDamage> => impl().listDamage(...args);
export const deleteCard = (...args: Parameters<typeof memory.deleteCard>): ReturnType<typeof memory.deleteCard> => impl().deleteCard(...args);
