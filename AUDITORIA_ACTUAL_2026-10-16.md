# Auditoría de ejecución y rentabilidad — 16 de octubre de 2026

**Dictamen:** hay infraestructura real desplegada y algunas rutas ejecutan correctamente en simulación, pero todavía existen fallos de integración, protección del capital y contabilidad que impiden considerar este sistema preparado para operar con beneficio verificable. Cambiar `DRY_RUN=false` permitiría intentar envíos; no corrige esos fallos ni crea un margen económico.

Revisión del commit `8be593c7b714973bc4ea7deac80da9cf229a8494`, del árbol de trabajo actual, de la API local del proceso en marcha y de ambos contratos mediante JSON-RPC público. Las consultas a cadena fueron exclusivamente `eth_chainId`, `eth_blockNumber`, `eth_getCode`, `eth_getBalance` y `eth_call`. Las reproducciones que transfieren tokens se ejecutaron únicamente en Hardhat local con tokens y routers de prueba. No se cambiaron `.env`, contratos ni código de producción, y no se enviaron órdenes reales.

El archivo `data/stats.json` ya tenía cambios y el proceso en marcha sigue actualizándolo. No se usó como evidencia de beneficios realizados. Los scripts de auditoría sustituyen la persistencia y las notificaciones durante las pruebas locales para no contaminarlo.

**1. Qué cambió y qué permanece**

La última revisión eliminó `/api/test-trigger`, varios contadores artificiales y etiquetas del panel, y retiró Optimism de la preparación de Permit2. Son mejoras concretas de presentación y alcance. No modificó `AgentWorker`, `SwarmManager`, `MultiChainExecutor`, la construcción de operaciones en Protocolink ni los errores principales de los ejecutores directos.

| Comprobación anterior | Estado actual |
|---|---|
| Endpoint que inyectaba oportunidades ficticias | Eliminado |
| Contadores de millones de agentes/pares en la API | Eliminados; quedan cifras y estados derivados incorrectamente en otras rutas |
| Contratos desplegados o propietario desconocidos | Verificados en ambas cadenas; coinciden con los artefactos locales y con la cartera de ejecución |
| Simulaciones contabilizadas como operaciones y ganancias realizadas | Persiste; reproducido |
| Arbitraje sustituido por un swap de una sola pata | Persiste en el fallback de Protocolink; reproducido |
| Selección `balancer` que termina usando Aave | Persiste en Protocolink; reproducido |
| Caché sin refrescar en la ruta por eventos | Persiste |
| Enrutamiento de eventos hacia trabajadores del par equivocado | Confirmado adicionalmente |
| Costes fijos y beneficio estimado usado como beneficio realizado | Persiste |
| Exclusión mutua insuficiente entre envíos | Persiste; reproducida con envíos simulados |

**2. Estado operativo comprobado**

Configuración observada: `DRY_RUN=true`, `MIN_PROFIT_USD=0.25`, `FLASH_LOAN_PROVIDER=balancer`, `SCAN_INTERVAL_MS=1000`. La clave está configurada; no se mostró ni guardó su contenido. La dirección derivada coincide con la cartera del panel: `0xf6Bb92Ac612D814F2A1e67Bf713F2f732419AC87`.

La dirección configurada en ambas cadenas es `0xD4A284DC95C17f981b7BaDD4b31Ae5Ae89854018`. Es válido que haya la misma dirección en cadenas diferentes: comprobé el bytecode de cada una por separado.

| Dato | Base | Arbitrum One |
|---|---:|---:|
| Bloque de comprobación de contratos y saldos | 52 684 550 | 515 391 254 |
| Bytecode de contrato | 12 470 bytes | 11 215 bytes |
| Coincidencia exacta con artefacto local | Sí | Sí |
| `owner()` coincide con cartera ejecutora | Sí | Sí |
| ETH nativo de la cartera | 0.009875606736286377 | 0.009757510412173643 |
| WETH de la cartera | 0 | 0 |
| Allowance de WETH desde cartera al contrato | 0 | 0 |
| WETH del contrato | 0 | 0 |
| Comisión Aave leída del Pool | 5 bps | 5 bps |
| Vault Balancer pausado | No | No |

Estos datos están fijados a los bloques indicados y pueden cambiar. Hay ETH para pagar algunas transacciones; la cantidad de intentos que permite depende del coste real de cada una. Las rutas spot con WETH no pueden funcionar con los saldos y permisos observados. Los flash loans no requieren que la cartera aporte el principal del préstamo; sí requieren gas y una ruta rentable.

La instantánea de la API local guardada en `scratch/audit_runtime_snapshot.json` mostraba 32 015 escaneos globales, 2 848 escaneos spot y cero ejecuciones en las categorías observadas. El contador `flashLoans.detectedOpportunitiesCount` también mostraba 2 848, aunque no había beneficio detectado: en `src/executor/spotExecutor.ts:273` se incrementa incluso cuando no se encontró una oportunidad rentable. Por tanto, esa cifra representa intentos en ese flujo, no oportunidades verificadas.

**3. Qué bloquea ahora las órdenes reales**

**A. El modo de ejecución está desactivado.** `src/config/env.ts:7` y las ramas `ENV.dryRun` de los ejecutores omiten el envío de las operaciones de arbitraje. No recomiendo cambiarlo todavía. Además, la expresión actual falla hacia modo live si falta la variable o si se escribe con un valor diferente de la cadena exacta `true`; debe validarse y fallar hacia simulación o rechazo de arranque.

**B. Las rutas que funcionan pueden no ser rentables.** Simulé préstamos de 0.5 WETH con mínimo de beneficio de 1 wei, fijando el estado por bloque. Estos resultados no son un barrido de todos los tamaños, activos o momentos:

| Cadena y ruta | Retorno antes de devolver el préstamo | Resultado |
|---|---:|---|
| Base: Uni → AeroV2 | 0.496789476000154213 WETH | `NotProfitable` |
| Base: AeroV2 → Uni | 0.499247045157978488 WETH | `NotProfitable` |
| Base: Uni → AeroCL | 0.499444054716027043 WETH | `NotProfitable` |
| Arbitrum: Uni → CamelotV3 | 0.499434700596787608 WETH | `NotProfitable` |
| Arbitrum: CamelotV3 → Uni | 0.499322743991393125 WETH | `NotProfitable` |

Bloques: Base 52 684 617; Arbitrum 515 391 767. En Balancer se requerían más de 0.5 WETH; en Aave, más de 0.50025 WETH. Estas rutas llegan al control económico del contrato y son rechazadas correctamente. Reducir el mínimo de ganancia no vuelve positivas estas operaciones: ya pierden tokens antes del gas. Tampoco demuestra que nunca aparezcan oportunidades futuras.

**C. Hay interfaces de router incorrectas.** En `contracts/BaseUniversalArbitrage.sol:398` y en el bloque compartido de `_swap` de `contracts/ArbitrumUniversalArbitrage.sol:173`, Pancake se invoca mediante la interfaz de Uniswap SwapRouter02 de siete campos. El router configurado de Pancake usa la variante de ocho campos, con `deadline`.

La inspección de bytecode encontró `0x414bf389` en Pancake y no `0x04e45aaf`; el contrato emite este último. Las simulaciones Uni → Pancake revierten sin el error económico `NotProfitable`, coherente con esa incompatibilidad. Sushi en Base presenta la misma diferencia de selector. En Arbitrum, la dirección configurada para Sushi (`contracts/ArbitrumUniversalArbitrage.sol:97`) devuelve `eth_getCode = 0x`.

Corregir esos adaptadores requiere modificar Solidity y desplegar contratos nuevos: las direcciones y llamadas están incorporadas al bytecode y estos contratos no implementan una actualización por proxy. No basta con cambiar una ABI en TypeScript. Uniswap → Aerodrome/Camelot puede seguir utilizándose tras las demás correcciones; el fallo no invalida automáticamente todos los DEX.

**D. El motor por eventos escanea otros pares y no actualiza sus datos.** `SwarmManager.initWorkers` asigna un par por posición, pero `triggerChainScan` busca el trabajador por `assignedAgentId` del registro, que sigue otra distribución. Reproducción actual:

- Los cinco primeros pares de Arbitrum disparan el trabajador 3, asignado a `ETH-WETH-DAI` en Ethereum.
- Los cinco primeros pares de Base disparan el trabajador 6, asignado a `ETH-WBTC-USDT` en Ethereum.
- `triggerChainScan` no llama a `refreshAllChains`. El refresco está en `startSwarmLoop`, cuya llamada sigue comentada en `src/index.ts`.

Por tanto, recibir un evento de Base o Arbitrum no equivale a evaluar su oportunidad con datos actualizados. Los tres ejecutores directos tienen temporizadores independientes y sí realizan simulaciones on-chain; este problema afecta al flujo Swarm/Protocolink y a sus promesas de reacción por eventos.

**E. Parte del dimensionamiento es inválido.** `src/executor/lowFeeExecutor.ts:209`, `:226` y `:290` separan únicamente seis decimales frente al resto. cbBTC declara ocho decimales, pero sus importes se crean con `parseEther` y su resultado se valora como ETH. Por ejemplo, `parseEther('1')` representa 10 000 000 000 cbBTC si el token tiene ocho decimales. Esto produce préstamos imposibles y valoraciones equivocadas. Debe usarse `parseUnits(cantidad, decimals)` y el precio del activo concreto.

También hay límites reales de liquidez: en la última consulta el Vault tenía aproximadamente 19.46 WETH en Base y 101.96 WETH en Arbitrum. El tier de 25 o 50 WETH no puede financiarse con ese saldo de Balancer en Base. Los límites deben consultarse por activo y proveedor.

**4. Qué podría provocar pérdidas**

**P0 — Fallback que transforma la estrategia.** `src/protocolink/protocolinkClient.ts:502` devuelve `buildDirectUniswapV3Transaction` cuando falla la construcción atómica. La reproducción produjo una única llamada `exactInputSingle`, sin préstamo, sin segunda pata y con `amountOutMinimum=0`. Si la cartera tiene tokens y permisos, puede realizar una compra direccional usando capital propio, aunque el llamador crea estar ejecutando arbitraje. En Base, además, ese fallback codifica la firma antigua de ocho campos para un router que utiliza siete.

La corrección es abortar toda la operación si no se puede construir exactamente el ciclo cerrado aprobado. Nunca degradar automáticamente un arbitraje a un swap. `getProtocolinkLogic` también prioriza Uniswap aunque la señal proviniera de otro DEX; una ruta nueva exige volver a evaluar la economía completa.

**P1 — Saldo previo que oculta pérdidas en contratos activos.** El callback de Balancer de Base compara el saldo total contra deuda y mínimo (`contracts/BaseUniversalArbitrage.sol:288`). Los callbacks de Arbitrum tienen el mismo problema de no separar el saldo anterior a la operación. Reproducción local con el contrato de Base sin modificar:

- Saldo previo del contrato: 0.02 tokens.
- Préstamo: 1 token; los swaps devuelven 0.99.
- El contrato ve 1.01, devuelve 1 al Vault y declara 0.01 de beneficio.
- El patrimonio conjunto de propietario y contrato cae 0.01, antes del gas.

Actualmente los contratos observados tenían cero WETH, por lo que esta prueba demuestra un defecto condicionado a saldo previo, no una pérdida observada en la cartera. La solución es capturar el saldo antes del préstamo y exigir un incremento suficiente después de devolverlo, distribuyendo solamente el beneficio de esa operación.

**P1 — Beneficio positivo en tokens pero negativo tras costes.** Spot usa 220 000 gas y 0.05 gwei; Arbitrum usa 280 000 gas y 0.1 gwei; LowFee descuenta una cantidad fija de USD 0.05. Después se ejecuta `estimateGas`, pero su resultado se utiliza para el límite de gas, sin recalcular el filtro de beneficio con la tarifa real. El `minProfit` enviado al contrato puede ser de apenas 40 o 50 mil millones de wei y no incorpora el coste total ni respeta uniformemente `ENV.minProfitUSD`.

Así puede confirmarse una operación que gana muy poco WETH y pierde más ETH en gas. Deben incluirse gas de ejecución, publicación L1 y cualquier cargo adicional aplicable a esa cadena, más un margen de incertidumbre. La documentación de OP Stack explica que publicar datos tiene un coste dependiente de la transacción comprimida; no se justifica sustituirlo por un tamaño fijo para cualquier payload. [Fuente: comisiones de OP Stack](https://docs.optimism.io/op-stack/transactions/fees).

**P1 — Envíos concurrentes y oportunidades duplicadas.** El indicador `isExecuting` se comprueba antes de varios `await` y se activa después de encontrar una simulación rentable. Dos llamadas pueden pasar la comprobación inicial. Reproduje dos envíos simulados concurrentes dentro de `SpotExecutor`. Además, Spot, LowFee, Arbitrum y MultiChain no comparten una cola global de nonce; el bloqueo de MultiChain no cubre los otros ejecutores.

`AgentWorker` también encola una misma oportunidad en un bundle y la envía individualmente. Aunque no se pague dos veces una operación idéntica en todos los casos, existe riesgo de nonce repetido, reemplazos, transacciones tardías y gas perdido. Debe haber un único coordinador por cartera y cadena, con deduplicación por ruta y estado, expiración y gestión de reemplazos.

**P1 — `DRY_RUN` no cubre las aprobaciones del arranque.** `src/executor/permit2ApprovalManager.ts:38` puede enviar `approve` reales sin comprobar `ENV.dryRun`. El arranque puede consumir gas y conceder permisos aunque los arbitrajes estén en simulación. Los permisos de Permit2 tampoco sustituyen el permiso ERC20 de la cartera hacia el contrato propio para spot. Se necesitan modos explícitos de solo lectura, preparación y live; ninguna aprobación debe aparecer como efecto lateral de iniciar observación.

**P1 si se reutiliza el contrato antiguo — callback sin autenticar.** En `contracts/FlashLoanArbitrageReceiver.sol:80`, el código verifica un parámetro `initiator` controlado por el llamador, pero no que `msg.sender` sea el Pool. Además ejecuta llamadas arbitrarias de `targets`. En Hardhat local un tercero retiró todo el token de prueba del receptor. Este contrato antiguo NO coincide con los dos contratos configurados y verificados en producción. Debe retirarse o repararse antes de volver a desplegarlo; no se debe atribuir ese drenaje a los contratos universales actuales.

**5. Por qué las métricas todavía no demuestran ganancias**

En `src/executor/spotExecutor.ts:336`, una simulación exitosa incrementa `onChainExecutedCount`, `executedCount` y `realizedPnLUSD`. Hay errores equivalentes en Arbitrum y LowFee. `MultiChainExecutor.broadcastTransaction` devuelve `true` tanto para un `eth_call` exitoso como para una transacción minada; su llamador contabiliza ambos como ejecución. La reproducción añadió USD 2.472 de supuesto beneficio realizado sin emitir ninguna transacción. La persistencia estuvo sustituida durante la prueba.

Incluso en live se suma el beneficio calculado antes de enviar, sin leer los eventos y costes reales del recibo. `statsStore` guarda únicamente los totales globales, mientras los ejecutores directos modifican sobre todo categorías internas: las cifras pueden perderse al reiniciar o quedar inconsistentes. No hay un libro reconciliado por `chainId + txHash + logIndex` que sustente el PnL.

El panel también conserva saldos iniciales fijos en `src/server.ts`, y su consulta periódica de balances nativos no convierte esas cifras en prueba de ganancias. Tener ETH o tokens puede reflejar un depósito, no una operación rentable. `/api/reset-stats` continúa sin autenticación y permite borrar historial si el servidor queda accesible desde fuera.

**6. Otros errores que dañan la búsqueda de oportunidades**

- `FLASH_LOAN_PROVIDER=balancer` no coincide con la condición `balancerv2` de `getFlashLoanPair`; Protocolink elige Aave. Los ejecutores directos realizan su propia elección y no tienen ese mismo bug de cadena de texto. El coste de Aave observado fue 5 bps; debe leerse por mercado y no asumirse como cero. [Fuente: flash loans de Aave](https://www.aave.com/docs/aave-v3/guides/flash-loans).
- El registro actual tiene 57 entradas para 40 direcciones de pool y 17 direcciones con metadatos de protocolo o fee contradictorios. Una dirección de Arbitrum está etiquetada a la vez como Pancake y Camelot. `getKnownPoolAddress` devuelve el primer elemento si no encuentra el fee solicitado y luego puede reetiquetarlo como otro tier. La solución es descubrir por factory, validar código, tokens, fee/tick spacing y rechazar ausencia de coincidencia exacta.
- `AgentWorker` todavía construye `outputAmount` con una rentabilidad fija del 0.1% cuando no hay oportunidad personalizada. No es una cotización ejecutable. La dirección elegida en el cruce de precios A/B puede estar invertida: vender A primero en el mercado que paga menos B reduce el retorno.
- La liquidez V3 se convierte a una profundidad USD aproximada y vuelve a multiplicarse por precio en el optimizador. No es una simulación de swaps que cruzan ticks. El precio marginal y `liquidity()` aislados no determinan la salida de un tamaño concreto. [Fuente: conceptos de liquidez e impacto de Uniswap](https://developers.uniswap.org/docs/get-started/concepts/glossary).
- Las alertas CEX comparan en ocasiones un precio A/B con USD y no tienen una pata CEX ejecutada/cubierta. Una divergencia frente a Binance no asegura beneficio de un ciclo DEX. Debe usarse como señal auxiliar con unidades compatibles, no sumarse como ganancia realizable.
- Los temporizadores de 750/1500 ms pueden solaparse mientras siguen pendientes las llamadas del ciclo anterior. Muchas reversiones se silencian y se muestran con el mismo texto de protección; no se distinguen falta de margen, pool inexistente, ABI inválida, allowance, liquidez insuficiente y RPC 429.
- El benchmark de `RPCManager` no configura automáticamente los providers propios creados por los ejecutores directos. Durante la auditoría los endpoints públicos originales devolvieron 403/429 y fue necesario consultar otros endpoints. Hace falta observar estado sincronizado, latencia y errores reales del provider utilizado para cotizar y ejecutar.

**7. Qué deben demostrar las pruebas**

TypeScript compiló correctamente. La recompilación forzada de Solidity compiló 10 archivos correctamente. La suite existente de fases terminó 17/17, pero verifica principalmente presencia de artefactos, métodos, patrones de texto y fórmulas sencillas: no detectó los fallos reproducidos. Preparé y ejecuté 12 comprobaciones adicionales en `scratch/audit_verification.cjs`, con resultados guardados en JSON.

El intento de la suite de fork con RPC deliberadamente inaccesible alcanzó el límite de 50 segundos y se terminó; no cuenta como suite de fork aprobada. Por inspección, los errores externos de cada fork se capturan sin registrar una prueba fallida y la condición final compara `passed !== total`: debe corregirse para que la falta de ejecución también falle. Las pruebas actuales de fork no prueban un ciclo de arbitraje rentable completo.

Faltan pruebas que verifiquen: adapters contra routers reales en un bloque fijo; un ciclo rentable completo creado de forma controlada en un fork; reversión de un ciclo perdedor sin consumir saldo previo; decimales 6/8/18; cero envíos/aprobaciones en modo observación; contabilidad diferenciada de simulación y minería; cola compartida de nonce; y rechazo tras cambio de estado, reorg o expiración. Crear una oportunidad artificial en un fork prueba ejecución, no rentabilidad espontánea en mainnet.

**8. Orden recomendado para poder operar**

1. **Corregir primero pérdida y registro.** Eliminar el fallback de un swap; reparar la protección sobre saldos previos; separar resultados `SIMULATED`, `SUBMITTED`, `MINED_SUCCESS`, `MINED_REVERTED` y `DROPPED`; bloquear aprobaciones y envíos en solo lectura. Retirar el receptor antiguo vulnerable.
2. **Consolidar la ejecución.** Un coordinador por cartera/cadena para todos los motores, nonce compartido, deduplicación y expiración. Configuración validada y `DRY_RUN` seguro por defecto. Separar preparación de permisos del bucle de búsqueda.
3. **Reparar los adaptadores y desplegar la versión corregida.** Interfaces específicas de Uniswap, Pancake, Sushi y Camelot; validar cada dirección y factory. Corregir decimales y precios. Desplegar contratos nuevos para modificar el comportamiento Solidity, actualizar su dirección y comprobar otra vez `chainId`, bytecode y propietario.
4. **Empezar por una cadena y pocas rutas verificadas.** Sugiero concentrar la validación inicial en Base con WETH/USDC y Uniswap/Aerodrome, porque esas llamadas llegaron correctamente al control de rentabilidad en las pruebas. Es una elección para reducir superficie de depuración, no una afirmación de mayor rentabilidad. Retirar temporalmente Swarm/Protocolink del envío hasta corregir asignaciones, caché, cotizaciones y proveedores. La fuente de eventos debe actualizar las pools afectadas antes de evaluar.
5. **Cotizar y dimensionar sobre el estado exacto.** Comparar ambas direcciones, varios tamaños y proveedores; consultar liquidez flash disponible y comisión; simular el calldata final. Elegir tamaño por beneficio neto medido, no el primer tier que devuelva un beneficio mínimo. Mantener bloque/hash de la señal, presupuesto máximo de coste y tiempo de expiración.
6. **Calcular costes antes de aprobar el envío.** Recalcular con el `estimateGas` real, tarifa del provider activo y coste L1 de esa transacción. Convertir coste y objetivo a unidades del activo prestado y pasarlos al mínimo on-chain, con margen por cambios de estado. Un porcentaje de slippage genérico del 1% puede ser mayor que todo el margen buscado.
7. **Preparar capital solo para la ruta elegida.** Flash: ETH para gas y acceso a liquidez del proveedor. Spot WETH: convertir la cantidad decidida de ETH a WETH y conceder al contrato corregido un allowance acotado. La aprobación de routers desde el contrato no autoriza que éste retire tokens de la cartera. No hace falta aportar principal propio a una ruta flash correctamente implementada.
8. **Activar live únicamente después de esas verificaciones.** Compilar, comprobar el identificador de versión del proceso y reiniciar con el `.env` esperado. Empezar con una sola operación pendiente por cadena, límite de gasto diario y parada ante desviación entre beneficio simulado y realizado. `DRY_RUN=false` sería el cambio operativo final; esta auditoría no lo ha realizado.

**9. Evidencia mínima para afirmar rentabilidad**

Para cada intento deben conservarse: ruta y tokens, cantidad, bloque/hash de cotización, estado simulado, calldata/identificador, proveedor del préstamo, comisión, coste previsto, nonce, hash de transacción, recibo, logs del contrato, gas realmente cobrado y resultado final. Las reversiones, aprobaciones y despliegues también consumen presupuesto y deben aparecer en la contabilidad.

El beneficio de una operación debe partir del incremento efectivo de activos atribuible al arbitraje, descontar el préstamo/comisión si todavía están incluidos en esa medida, y restar todos los costes realmente cobrados. Si se usa un evento que ya devuelve beneficio después de la comisión flash, no debe restarse esa comisión por segunda vez.

La rentabilidad operativa exige sumar los resultados de todos los intentos, descontar gas de operaciones fallidas y exitosas, preparación y despliegues amortizados, RPC y VPS; reconciliar cartera más contratos; y separar depósitos/retiros de ganancias. También debe separarse el cambio de precio de los tokens de la rentabilidad del arbitraje.

Recomiendo una fase de observación con datos de varios días y replay en el estado de inclusión, seguida de una muestra pequeña de ejecuciones reales con riesgo limitado después de las correcciones. Como criterio inicial de evaluación, puede fijarse una ventana de 7–14 días, pero la cantidad de oportunidades independientes y la variabilidad de resultados importan más que el calendario. Una operación positiva prueba que se puede ejecutar; una secuencia neta positiva y reconciliada permite evaluar si la ventaja se repite. La evidencia revisada aún no permite afirmar esa ventaja.

Los flash loans facilitan financiación atómica; no producen por sí mismos una diferencia favorable de precios. Una reversión protege la atomicidad de los swaps, pero una transacción revertida incluida en cadena consume gas. No hay base para proyectar ganancias diarias o mensuales a partir de los contadores actuales.

**10. Artefactos y límites de esta revisión**

- `scratch/audit_verification.cjs` y `scratch/audit_verification_results.json`: reproducciones locales, sin fondos reales ni persistencia de producción.
- `scratch/audit_live_readonly.cjs` y `scratch/audit_live_readonly_results.json`: propietario, bytecode, saldos y parámetros de los mercados en los bloques indicados.
- `scratch/audit_routes_readonly.cjs` y `scratch/audit_routes_readonly_results.json`: 14 simulaciones de rutas desplegadas, errores y selectores de routers.
- `scratch/audit_runtime_snapshot.json`: instantánea de la API local, con URLs de logs ocultas.
- `scratch/audit_source_manifest.json`: commit y SHA-256 de 61 archivos para identificar la versión revisada.

Los resultados de red son instantáneas, no promesas sobre el estado futuro ni un análisis exhaustivo de todos los mercados. Las pruebas con mocks demuestran errores del código bajo las condiciones descritas; no son evidencia de pérdidas históricas de la cartera. No se revisó una cuenta remota de VPS ni se certificó una estrategia rentable.
