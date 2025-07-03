"use server";

import { generateHydeText } from "../lib/api";

export async function generateHydeAction(question: string) {
    console.log("uploading files to the backend");
    return generateHydeText(question);
}