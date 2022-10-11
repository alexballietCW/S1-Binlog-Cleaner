const fs = require('fs');
console.clear()
const CHUNK_SIZE = 1024 ** 2;

run()
async function run() {
    let allFiles = fs.readdirSync('./')
    let binlogs = allFiles.filter(filename => filename.match(/\.binlog$/))
    for (let binlog of binlogs) await processBinlog(binlog)

    async function processBinlog(inputPath) {
        return new Promise(resolve => {
            let startTime = Date.now()

            const stream = fs.createReadStream(inputPath, {
                encoding: 'binary',
                highWaterMark: CHUNK_SIZE
            });
            const writeStream = fs.createWriteStream(`${inputPath}.txt`, {
                encoding: "utf8",
                highWaterMark: CHUNK_SIZE
            })

            stream.on("data", data => {
                let arr = new Int32Array(Buffer.from(data))
                let arr2 = arr.filter(byte => byte == 0 ? false : true)
                let arr3 = arr2.map(byte => {
                    if (byte >= 32 && byte <= 126) return byte
                    return 13 //carriage return utf codepoint
                })

                let arr4 = [];
                let returnFlag = true //Have we seen a new return since the last
                //time that we pushed data to the new array?
                let buffer = []
                for (let char of arr3) {
                    //remove redundant returns
                    if (char == 13) {
                        if (!returnFlag) {
                            returnFlag = true
                            if (buffer.length == 0) buffer.push(13)
                        }
                    }

                    const SHORT_STR_LEN = 5
                    //remove string less than or equal to SHORT_STR_LEN chars
                    if (char == 13) {
                        if (buffer.length <= SHORT_STR_LEN + 1)
                            buffer = [13, 13]
                        else {
                            let str = Buffer.from(buffer).toString()
                            writeStream.write(str)
                            buffer = []
                            returnFlag = false
                        }
                    } else buffer.push(char)
                }
            })

            stream.on('end', () => {
                let endTime = Date.now()
                console.log(`File "${inputPath} cleaned in ${(endTime - startTime) /1000} seconds`)
                resolve()
            })
        })
    }
}