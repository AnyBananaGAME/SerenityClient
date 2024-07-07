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
        console.info(this.date(), chalk.gray("DEBUG"), ...message, this.getCallerPath())
    }

    static date(){
        const date = new Date();
        return `${chalk.gray("[")}${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${chalk.dim(date.getMilliseconds())}${chalk.gray("]")}`
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
}

export default Logger;
