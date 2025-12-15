const path = require('path');

require('dotenv').config();

const express = require('express');

const apiRoutes = require('./routes/api');
const configService = require('./services/configService');
const corsMiddleware = require('./middleware/cors');
const requestLogger = require('./middleware/requestLogger');
const { jsonParser, urlencodedParser } = require('./middleware/parsers');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');

app.use(requestLogger);
app.use(corsMiddleware);
app.use(jsonParser);
app.use(urlencodedParser);

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(configService.port, () => {
  console.log(`Server listening on http://localhost:${configService.port}`);
});
