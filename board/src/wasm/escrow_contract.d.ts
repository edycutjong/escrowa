// world root:component/root
export interface ContractInput {
  functionName: string,
  inputJson: string,
}
export interface ContractOutput {
  outputJson: string,
}
export type ContractError = ContractErrorErr;
export interface ContractErrorErr {
  tag: 'err',
  val: string,
}
export type * as T3nEscrowHost from './interfaces/t3n-escrow-host.js'; // import t3n:escrow/host
export type * as WasiCliEnvironment026 from './interfaces/wasi-cli-environment.js'; // import wasi:cli/environment@0.2.6
export type * as WasiCliExit026 from './interfaces/wasi-cli-exit.js'; // import wasi:cli/exit@0.2.6
export type * as WasiCliStderr026 from './interfaces/wasi-cli-stderr.js'; // import wasi:cli/stderr@0.2.6
export type * as WasiIoError026 from './interfaces/wasi-io-error.js'; // import wasi:io/error@0.2.6
export type * as WasiIoStreams026 from './interfaces/wasi-io-streams.js'; // import wasi:io/streams@0.2.6
export function dispatch(input: ContractInput): ContractOutput;
export type Result<T, E> = { tag: 'ok', val: T } | { tag: 'err', val: E };
