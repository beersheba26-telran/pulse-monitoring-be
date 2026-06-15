import { ErrorRequestHandler } from 'express';
import logger from '../../logger';
import HttpError from '../errors/HttpError';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    const error = err instanceof HttpError
        ? err
        : new HttpError(500, err instanceof Error ? err.message : 'Internal Server Error');

    logger.error(
        {
            error: err,
            method: req.method,
            path: req.originalUrl,
            statusCode: error.statusCode,
        },
        'Request failed'
    );

    res.status(error.statusCode).json({
        error: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
    });
};
