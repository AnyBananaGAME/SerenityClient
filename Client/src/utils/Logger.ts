import chalk from "chalk";
import path from "path";

class Logger {

    static info(...message: any){
        console.info(this.date(), chalk.blueBright("INFO"), chalk.cyanBright(...message))
    }

    static warn(...message: any){
        console.info(this.date(), chalk.yellow("WARN"), chalk.yellowBright(...message))
    }

    static error(...message: any){
        console.info(this.date(), chalk.red("ERROR"), chalk.redBright(...message), this.getCallerPath())
    }

    static debug(...message: any){
        if(_client.options.debug || process.argv.includes('--debug'))
        console.info(this.date(), chalk.gray("DEBUG"), ...message, this.getCallerPath())
    }

    static date(){
        const date = new Date();
        return `${chalk.gray("[")}${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${chalk.dim(date.getMilliseconds())}${chalk.gray("]")}`
    }

    static chat(message: string){
        console.info(this.date(), chalk.green("CHAT"), this.chatColors(message))
    }

    static getCallerPath() {
        const err = new Error();
        const stack = err.stack?.split("\n");
        if (stack && stack.length > 3) {
            const callerLine = stack[3].trim();
            const match = callerLine.match(/\((.*):(\d+):(\d+)\)$/);
            if (match) {
                const filePath = path.relative(process.cwd(), match[1]);
                const lineNumber = match[2];
                return `${chalk.magenta(filePath)}:${chalk.green(lineNumber)}`;
            }
        }
        return chalk.magenta("Unknown caller");
    }


    static chatColors(text: string){
        const ansiColors: { [key: string]: string } = {
            "0": "\u001B[30m", "1": "\u001B[34m", "2": "\u001B[32m", "3": "\u001B[36m",
            "4": "\u001B[31m", "5": "\u001B[35m", "6": "\u001B[33m", "7": "\u001B[37m",
            "8": "\u001B[90m", "9": "\u001B[94m", "a": "\u001B[92m", "b": "\u001B[96m",
            "c": "\u001B[91m", "d": "\u001B[95m", "e": "\u001B[93m", "f": "\u001B[97m",
            "r": "\u001B[0m"
        };    
        return text.replace(/§[\da-fk-or]/g, m => ansiColors[m[1]] || "") + "\u001B[0m";
    }

}

export default Logger;
