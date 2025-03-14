const { ApiError } = require('../middleware/errorHandler');
const Template = require('../models/template.model');
const logger = require('../utils/logger');

/**
 * Create a new template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createTemplate = async (req, res, next) => {
  try {
    const { name, type, subject, content } = req.body;
    
    // Check if template with the same name already exists
    const existingTemplate = await Template.findOne({ name });
    if (existingTemplate) {
      throw new ApiError(400, `Template with name '${name}' already exists`);
    }
    
    // Create template
    const template = new Template({
      name,
      type,
      subject,
      content
    });
    
    // Save template
    const savedTemplate = await template.save();
    
    logger.info(`Template created: ${savedTemplate.name}`);
    
    res.status(201).json({
      status: 'success',
      data: savedTemplate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all templates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getTemplates = async (req, res, next) => {
  try {
    const { type, isActive, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    
    if (type) {
      query.type = type.toUpperCase();
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query
    const templates = await Template.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const total = await Template.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      results: templates.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const template = await Template.findById(id);
    
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }
    
    res.status(200).json({
      status: 'success',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template by name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getTemplateByName = async (req, res, next) => {
  try {
    const { name } = req.params;
    
    const template = await Template.findOne({ name });
    
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }
    
    res.status(200).json({
      status: 'success',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template by name (internal method)
 * @param {string} name - Template name
 * @returns {Promise<Object>} - Template object
 */
const getTemplateByNameInternal = async (name) => {
  try {
    const template = await Template.findOne({ name, isActive: true });
    
    if (!template) {
      logger.error(`Template not found: ${name}`);
      return null;
    }
    
    return template;
  } catch (error) {
    logger.error(`Error getting template by name: ${error.message}`);
    return null;
  }
};

/**
 * Render template by name (internal method)
 * @param {string} name - Template name
 * @param {Object} variables - Variables to replace in the template
 * @returns {Promise<Object>} - Rendered template
 */
const renderTemplateByName = async (name, variables = {}) => {
  try {
    const template = await getTemplateByNameInternal(name);
    
    if (!template) {
      return null;
    }
    
    // Render template by replacing variables
    let renderedContent = template.content;
    let renderedSubject = template.subject || '';
    
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        renderedContent = renderedContent.replace(regex, value);
        renderedSubject = renderedSubject.replace(regex, value);
      });
    }
    
    return {
      name: template.name,
      type: template.type,
      subject: renderedSubject,
      content: renderedContent
    };
  } catch (error) {
    logger.error(`Error rendering template: ${error.message}`);
    return null;
  }
};

/**
 * Update template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, subject, content, isActive } = req.body;
    
    const template = await Template.findById(id);
    
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }
    
    // Check if new name already exists (if name is being changed)
    if (name && name !== template.name) {
      const existingTemplate = await Template.findOne({ name });
      if (existingTemplate) {
        throw new ApiError(400, `Template with name '${name}' already exists`);
      }
      template.name = name;
    }
    
    // Update fields if provided
    if (type) template.type = type;
    if (subject !== undefined) template.subject = subject;
    if (content) template.content = content;
    if (isActive !== undefined) template.isActive = isActive;
    
    // Save updated template
    const updatedTemplate = await template.save();
    
    logger.info(`Template updated: ${updatedTemplate.name}`);
    
    res.status(200).json({
      status: 'success',
      data: updatedTemplate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const template = await Template.findById(id);
    
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }
    
    await Template.findByIdAndDelete(id);
    
    logger.info(`Template deleted: ${template.name}`);
    
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Render template with variables
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const renderTemplate = async (req, res, next) => {
  try {
    const { name } = req.params;
    const { variables } = req.body;
    
    const template = await Template.findOne({ name });
    
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }
    
    if (!template.isActive) {
      throw new ApiError(400, 'Template is not active');
    }
    
    // Render template by replacing variables
    let renderedContent = template.content;
    
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        renderedContent = renderedContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });
    }
    
    // Check if any variables are still present in the rendered content
    const remainingVariables = renderedContent.match(/\{\{([^}]+)\}\}/g) || [];
    
    res.status(200).json({
      status: 'success',
      data: {
        name: template.name,
        type: template.type,
        subject: template.subject ? template.subject.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          return variables && variables[key] ? variables[key] : match;
        }) : null,
        content: renderedContent,
        remainingVariables: remainingVariables.map(v => v.replace(/\{\{|\}\}/g, ''))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  getTemplateByName,
  getTemplateByNameInternal,
  renderTemplateByName,
  updateTemplate,
  deleteTemplate,
  renderTemplate
}; 