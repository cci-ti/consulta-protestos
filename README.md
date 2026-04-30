# Consulta de Protestos

MVP en React + Vite para capturar solicitudes públicas de consulta por DNI o RUC y enviarlas a un flujo de n8n. El envío operativo a WhatsApp queda delegado al webhook de n8n conectado con Evolution API.

## Alcance del MVP

- Formulario público sin cuenta ni inicio de sesión.
- Captura de datos mínimos del consultor.
- Captura del DNI o RUC consultado.
- Validaciones básicas de formato.
- Copia automática del documento consultado cuando el consultor declara que es el titular.
- Consentimiento de tratamiento de datos personales.
- Envío de solicitud al webhook de n8n.
- Mensajes de confirmación, error y estado para el usuario.

## Configuración

Crear un archivo `.env.local` con:

```bash
VITE_N8N_WEBHOOK_URL=https://n8n-n8n.ricijy.easypanel.host/webhook/consulta-protestos
```

## Comandos

```bash
npm install
npm run dev
npm run build
```

## Payload enviado a n8n

El frontend envía un JSON con:

- `consultor`: datos de quien solicita la consulta.
- `consultado`: tipo y número de documento a consultar.
- `consentimiento`: aceptación y texto legal visible.
- `origen`: metadatos básicos de la solicitud.

## Observación crítica

En Vite, cualquier variable `VITE_*` queda expuesta en el navegador. Para un MVP puede servir si el webhook de n8n valida, limita y filtra correctamente las solicitudes. Si el producto empieza a recibir tráfico real, conviene mover el envío a un backend liviano o proteger el flujo con controles adicionales.
