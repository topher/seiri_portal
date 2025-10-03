// MyceliumQL Webhook Router Service
// Centralized webhook ingestion for Shopify, Twilio, and SendGrid

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { CartridgeRegistry } from './registry';
import { authenticateWebhook } from './middleware';
import { logger } from './utils/logger';

export class WebhookRouter {
  private app: express.Application;
  private registry: CartridgeRegistry;

  constructor() {
    this.app = express();
    this.registry = new CartridgeRegistry();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Health check middleware (before body parsing)
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'webhook-router',
        timestamp: new Date().toISOString()
      });
    });

    // Use raw body for webhook signature verification
    // Different services require different body parsing approaches

    // SendGrid: Raw body for ECDSA signature verification
    this.app.use('/webhooks/sendgrid/*', bodyParser.raw({ 
      type: 'application/json',
      limit: '10mb'
    }));
    
    // Twilio: URL-encoded for SMS webhooks
    this.app.use('/webhooks/twilio/*', bodyParser.urlencoded({ 
      extended: true,
      limit: '10mb'
    }));
    
    // Shopify: Raw body for HMAC-SHA256 verification
    this.app.use('/webhooks/shopify/*', bodyParser.raw({ 
      type: 'application/json',
      limit: '10mb'
    }));
    
    // Default JSON for everything else
    this.app.use(bodyParser.json({ limit: '10mb' }));

    // Logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length')
      });
      next();
    });
  }

  private setupRoutes() {
    // Shopify webhooks (HMAC-SHA256 verification)
    this.app.post('/webhooks/shopify/:tenantId/:topic', async (req, res) => {
      try {
        const { tenantId, topic } = req.params;
        const shopifyTopic = req.headers['x-shopify-topic'] as string;
        
        logger.info(`Shopify webhook received: ${shopifyTopic}`, { tenantId, topic });
        
        // Get tenant's Shopify cartridge
        const cartridge = await this.registry.getCartridge(tenantId, 'shopify');
        
        // Handle webhook with signature validation
        await cartridge.handleWebhook({
          rawBody: req.body,
          headers: req.headers as Record<string, string>,
          topic: shopifyTopic
        });
        
        res.status(200).send('OK');
        logger.info(`Shopify webhook processed successfully`, { tenantId, topic: shopifyTopic });
        
      } catch (error: any) {
        logger.error('Shopify webhook error:', { 
          error: error.message, 
          stack: error.stack,
          tenantId: req.params.tenantId,
          topic: req.params.topic
        });
        
        const statusCode = error.message === 'Invalid webhook signature' ? 401 : 500;
        res.status(statusCode).send(error.message);
      }
    });

    // Twilio webhooks (HMAC-SHA1 verification)
    this.app.post('/webhooks/twilio/:tenantId/:type', async (req, res) => {
      try {
        const { tenantId, type } = req.params;
        
        logger.info(`Twilio webhook received: ${type}`, { tenantId });
        
        // Get tenant's Twilio cartridge
        const cartridge = await this.registry.getCartridge(tenantId, 'twilio');
        
        // Handle webhook with signature validation
        await cartridge.handleWebhook({
          body: req.body,
          headers: req.headers as Record<string, string>,
          path: req.path,
          type
        });
        
        // Twilio expects TwiML response for SMS webhooks
        if (type === 'sms') {
          res.type('text/xml');
          res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        } else {
          res.status(200).send('OK');
        }
        
        logger.info(`Twilio webhook processed successfully`, { tenantId, type });
        
      } catch (error: any) {
        logger.error('Twilio webhook error:', { 
          error: error.message, 
          stack: error.stack,
          tenantId: req.params.tenantId,
          type: req.params.type
        });
        
        const statusCode = error.message === 'Invalid webhook signature' ? 401 : 500;
        res.status(statusCode).send(error.message);
      }
    });

    // SendGrid webhooks (ECDSA signature verification)
    this.app.post('/webhooks/sendgrid/:tenantId', async (req, res) => {
      try {
        const { tenantId } = req.params;
        
        logger.info(`SendGrid webhook received`, { tenantId });
        
        // Get tenant's SendGrid cartridge
        const cartridge = await this.registry.getCartridge(tenantId, 'sendgrid');
        
        // Handle webhook with signature validation
        await cartridge.handleWebhook({
          rawBody: req.body,
          headers: req.headers as Record<string, string>
        });
        
        res.status(200).send('OK');
        logger.info(`SendGrid webhook processed successfully`, { tenantId });
        
      } catch (error: any) {
        logger.error('SendGrid webhook error:', { 
          error: error.message, 
          stack: error.stack,
          tenantId: req.params.tenantId
        });
        
        const statusCode = error.message === 'Invalid webhook signature' ? 401 : 500;
        res.status(statusCode).send(error.message);
      }
    });

    // Generic webhook endpoint for testing
    this.app.post('/webhooks/test/:tenantId/:service', async (req, res) => {
      try {
        const { tenantId, service } = req.params;
        
        logger.info(`Test webhook received`, { tenantId, service, body: req.body });
        
        res.json({
          success: true,
          tenantId,
          service,
          timestamp: new Date().toISOString(),
          headers: req.headers,
          body: req.body
        });
        
      } catch (error: any) {
        logger.error('Test webhook error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Webhook endpoint not found',
        path: req.path,
        availableEndpoints: [
          '/webhooks/shopify/:tenantId/:topic',
          '/webhooks/twilio/:tenantId/:type',
          '/webhooks/sendgrid/:tenantId',
          '/webhooks/test/:tenantId/:service'
        ]
      });
    });
  }

  async start(port: number = 3000) {
    await this.registry.initialize();
    
    this.app.listen(port, () => {
      logger.info(`🪝 MyceliumQL Webhook Router listening on port ${port}`, {
        environment: process.env.NODE_ENV,
        endpoints: {
          shopify: `/webhooks/shopify/:tenantId/:topic`,
          twilio: `/webhooks/twilio/:tenantId/:type`,
          sendgrid: `/webhooks/sendgrid/:tenantId`,
          health: `/health`
        }
      });
    });
  }
}

// Start the webhook router if this file is run directly
if (require.main === module) {
  const router = new WebhookRouter();
  const port = parseInt(process.env.WEBHOOK_PORT || '3000');
  router.start(port);
}