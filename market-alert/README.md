# CCXT Market Alert

第一版行情报警服务，作为 CCXT 仓库下的独立子项目运行。

## 范围

- Binance 现货与 U 本位永续。
- 按 `exchange + marketType` 合并订阅，`last` 使用 `watchTickers()`，`markPrice` 使用 `watchMarkPrices()`。
- `last` 与 `markPrice`。
- `price_change` 与 `price_target`。
- YAML + Zod 配置校验。
- 内存滚动窗口、冷却、重置和去重。
- Console 与 Webhook JSON 输出。
- Webhook 超时、指数退避、幂等键、可选 HMAC 和 `dead-letter.jsonl`。

## 运行

最小启动命令：

```powershell
cd market-alert
npm.cmd install
npm.cmd run dev -- rules.example.yaml
```

`rules.example.yaml` 当前包含：

- BTC U 本位 mark price 下探到 `58500` 的报警。
- Binance 现货和 U 本位全市场 5 分钟波动 `20%` 报警。
- Binance 现货和 U 本位全市场 10 分钟波动 `30%` 报警。
- `logPrices: true`：每次收到行情都会在 Console 打印价格 JSON，即使没有触发报警。
- 价格和报警状态保存到 `data/market-alert.sqlite`，使用 SQLite WAL 模式。

报警 Webhook 和 Console 共用以下四字段格式：

```json
{
  "symbol": "BTC/USDT",
  "direction": "上穿",
  "currentPrice": "65000",
  "threshold": "65000"
}
```

行情通过 CCXT Pro WebSocket 接收，不需要 Binance API Key；当前规则使用 Binance 全市场频道，因此不会为每个币对创建独立 worker。价格窗口在内存中按规则、市场和 symbol 分开维护，5 分钟和 10 分钟规则互不干扰。

验证命令：

```powershell
npm.cmd run build
npm.cmd test
```

单元测试会用模拟价格触发规则，并覆盖冷却、重置、symbol 过滤、Webhook JSON、SQLite 重启恢复。测试真实 webhook 时，建议使用单独的测试回调地址或临时测试规则，不要把生产阈值改低后忘记恢复。

行情 worker 需要 CCXT Pro 的 WebSocket 能力。订阅 symbol 的最小市场元数据在本地注入，因此启动时不会调用 REST `loadMarkets()`；没有可用的 WebSocket 方法时应在运行环境中提供对应 CCXT 版本，而不是为每个 symbol 创建独立业务 worker。
