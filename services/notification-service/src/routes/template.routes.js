const express = require('express');
const { body, param, query } = require('express-validator');
const templateController = require('../controllers/template.controller');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @route POST /api/templates
 * @desc Create a new template
 * @access Private
 */
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Template name is required'),
    body('type')
      .notEmpty()
      .withMessage('Template type is required')
      .isIn(['EMAIL', 'SMS', 'PUSH', 'IN_APP'])
      .withMessage('Invalid template type'),
    body('subject')
      .if(body('type').equals('EMAIL'))
      .notEmpty()
      .withMessage('Subject is required for email templates'),
    body('content').notEmpty().withMessage('Content is required'),
    validate
  ],
  templateController.createTemplate
);

/**
 * @route GET /api/templates
 * @desc Get all templates
 * @access Private
 */
router.get(
  '/',
  [
    query('type')
      .optional()
      .isIn(['EMAIL', 'SMS', 'PUSH', 'IN_APP'])
      .withMessage('Invalid template type'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    validate
  ],
  templateController.getTemplates
);

/**
 * @route GET /api/templates/:id
 * @desc Get template by ID
 * @access Private
 */
router.get(
  '/:id',
  [
    param('id').notEmpty().withMessage('Template ID is required'),
    validate
  ],
  templateController.getTemplateById
);

/**
 * @route GET /api/templates/name/:name
 * @desc Get template by name
 * @access Private
 */
router.get(
  '/name/:name',
  [
    param('name').notEmpty().withMessage('Template name is required'),
    validate
  ],
  templateController.getTemplateByName
);

/**
 * @route PATCH /api/templates/:id
 * @desc Update template
 * @access Private
 */
router.patch(
  '/:id',
  [
    param('id').notEmpty().withMessage('Template ID is required'),
    body('name').optional(),
    body('type')
      .optional()
      .isIn(['EMAIL', 'SMS', 'PUSH', 'IN_APP'])
      .withMessage('Invalid template type'),
    body('subject').optional(),
    body('content').optional(),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validate
  ],
  templateController.updateTemplate
);

/**
 * @route DELETE /api/templates/:id
 * @desc Delete template
 * @access Private
 */
router.delete(
  '/:id',
  [
    param('id').notEmpty().withMessage('Template ID is required'),
    validate
  ],
  templateController.deleteTemplate
);

/**
 * @route POST /api/templates/render/:name
 * @desc Render template with variables
 * @access Private
 */
router.post(
  '/render/:name',
  [
    param('name').notEmpty().withMessage('Template name is required'),
    body('variables').optional().isObject().withMessage('Variables must be an object'),
    validate
  ],
  templateController.renderTemplate
);

module.exports = router; 