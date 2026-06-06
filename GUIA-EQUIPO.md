# Guía de uso — Lookahead Planning (modo gratuito con OneDrive)

Esta app funciona **100% en el navegador**. No necesita servidor ni base de datos
de pago. Los datos se guardan en tu navegador y se comparten con tu equipo a
través de un **archivo que guardas en una carpeta compartida de OneDrive**.

## ¿Dónde se guardan los datos?

- Mientras trabajas, todo se guarda automáticamente en **tu navegador** (en este
  dispositivo). Si cierras y vuelves a abrir, tus datos siguen ahí.
- Para **compartir con el equipo** o **respaldar**, usas los botones
  **Exportar** / **Importar** (sección "Datos (OneDrive)" en la barra lateral).

## Flujo de trabajo recomendado

1. **Quien edita** abre la app y carga el último archivo del equipo:
   - Botón **Importar** → elige el archivo `lookahead-XXXX.json` desde la carpeta
     compartida de OneDrive (ya sincronizada en tu PC).
2. Trabaja normal: sube Excel, crea/edita sticky notes.
3. Al terminar, botón **Exportar** → descarga `lookahead-AAAA-MM-DD.json`.
4. Mueve/reemplaza ese archivo en la **carpeta compartida de OneDrive**.
5. Avisa al equipo que hay una versión nueva.

> ⚠️ **Regla de oro:** una sola persona edita a la vez. Si dos editan y suben al
> mismo tiempo, OneDrive creará "copias en conflicto". Funciona igual que un
> archivo de Excel compartido tradicional.

## Importar reemplaza todo

Al importar, se **reemplazan todos los datos** de este dispositivo por los del
archivo. La app te pide confirmación antes de hacerlo.

---

# Despliegue gratuito (GitHub Pages)

El sitio se publica solo, gratis, cada vez que se hace push a `main`:

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Haz push a `main`. El workflow `.github/workflows/deploy-pages.yml` construye y
   publica el sitio.
3. La URL será: `https://<usuario>.github.io/look-at-head-/`

> Si cambias el nombre del repositorio, ajusta `base` en `frontend/vite.config.ts`
> (o define la variable de entorno `VITE_BASE`).

## Desarrollo local

```bash
cd frontend
npm install
npm run dev
```

La app abre en `http://localhost:5173/look-at-head-/`. Ya **no requiere** levantar
el backend; toda la lógica (incluido el parseo de Excel) corre en el navegador.
