"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.download = void 0;
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
async function download(url, targetFile) {
    return await new Promise((resolve, reject) => {
        https_1.default.get(url, response => {
            const code = response.statusCode ?? 0;
            if (code >= 400) {
                return reject(new Error(response.statusMessage));
            }
            // handle redirects
            if (code > 300 && code < 400 && !!response.headers.location) {
                return download(response.headers.location, targetFile);
            }
            console.log(response);
            // save the file to disk
            const fileWriter = fs_1.default
                .createWriteStream(targetFile)
                .on('finish', () => {
                resolve();
            });
            response.pipe(fileWriter);
        }).on('error', error => {
            reject(error);
        });
    });
}
exports.download = download;