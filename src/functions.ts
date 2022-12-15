import https from 'node:https';
import fs from 'node:fs';

export async function download (url: string, targetFile: string): Promise<void> {
    return await new Promise((resolve, reject) => {
        https.get(url, response => {
            const code = response.statusCode ?? 0

            if (code >= 400) {
                return reject(new Error(response.statusMessage))
            }

            // handle redirects
            if (code > 300 && code < 400 && !!response.headers.location) {
                return download(response.headers.location, targetFile)
            }

            console.log(response)

            // save the file to disk
            const fileWriter = fs
                .createWriteStream(targetFile)
                .on('finish', () => {
                    resolve()
                })

            response.pipe(fileWriter)
        }).on('error', error => {
            reject(error)
        })
    })
}