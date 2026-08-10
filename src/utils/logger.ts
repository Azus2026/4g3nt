import chalk from 'chalk';

export const logger = {
  info: (msg: string) => console.log(chalk.blue(`[INFO] ${msg}`)),
  success: (msg: string) => console.log(chalk.green(`[SUCCESS] ${msg}`)),
  warn: (msg: string) => console.log(chalk.yellow(`[WARN] ${msg}`)),
  error: (msg: string) => console.log(chalk.red(`[ERROR] ${msg}`)),
  ai: (msg: string) => console.log(chalk.magenta(`[AI STRATEGY] ${msg}`)),
  cex: (msg: string) => console.log(chalk.cyan(`[CEX SCANNER] ${msg}`)),
  rpc: (msg: string) => console.log(chalk.gray(`[RPC MANAGER] ${msg}`)),
  divider: () => console.log(chalk.gray('--------------------------------------------------------------------------------')),
};
