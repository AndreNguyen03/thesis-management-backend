#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function parseArgs() {
    const args = process.argv.slice(2)
    const out = {}
    for (let i = 0; i < args.length; i++) {
        const a = args[i]
        if (a === '--input' || a === '-i') out.input = args[++i]
        else if (a === '--output' || a === '-o') out.output = args[++i]
        else if (a === '--overwrite' || a === '-w') out.overwrite = true
        else if (a === '--help' || a === '-h') out.help = true
        else if (!out.input) out.input = a
        else if (!out.output) out.output = a
    }
    return out
}

function usage() {
    console.log(
        'Usage: node remove-duplicate-keys.js [--input|-i] <input.json> [--output|-o] <out.json> [--overwrite|-w]'
    )
}

async function main() {
    const args = parseArgs()
    if (args.help || !args.input) {
        usage()
        process.exit(args.help ? 0 : 1)
    }

    const inputPath = path.resolve(process.cwd(), args.input)
    const defaultOutput = path.join(path.dirname(inputPath), path.basename(inputPath, '.json') + '.dedup.json')
    const outputPath = args.output ? path.resolve(process.cwd(), args.output) : defaultOutput

    let raw
    try {
        raw = fs.readFileSync(inputPath, 'utf8')
    } catch (err) {
        console.error('Failed to read input file:', inputPath, err.message)
        process.exit(2)
    }

    let data
    try {
        data = JSON.parse(raw)
    } catch (err) {
        console.error('Invalid JSON in input file:', err.message)
        process.exit(3)
    }

    if (!Array.isArray(data)) {
        console.error('Expected a JSON array in the input file.')
        process.exit(4)
    }

    const seen = new Set()
    const outArr = []
    let duplicates = 0
    for (const item of data) {
        const k = item && (typeof item.key === 'string' ? item.key : null)
        if (!k) {
            outArr.push(item)
            continue
        }
        if (seen.has(k)) {
            duplicates++
            continue
        }
        seen.add(k)
        outArr.push(item)
    }

    try {
        if (args.overwrite) {
            fs.writeFileSync(inputPath, JSON.stringify(outArr, null, 4), 'utf8')
            console.log(`Wrote deduped array back to ${inputPath}`)
        } else {
            fs.writeFileSync(outputPath, JSON.stringify(outArr, null, 4), 'utf8')
            console.log(`Wrote deduped array to ${outputPath}`)
        }
        console.log(`Original items: ${data.length}. Kept: ${outArr.length}. Duplicates removed: ${duplicates}.`)
    } catch (err) {
        console.error('Failed to write output file:', err.message)
        process.exit(5)
    }
}

main()
