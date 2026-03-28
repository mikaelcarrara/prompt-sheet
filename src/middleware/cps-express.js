const PromptResolver = require('../prompt-resolver');

function attachCpsRoutes(app, opts = {}) {
  const rootPath = opts.rootPath || process.cwd();
  const resolver = new PromptResolver(rootPath);

  app.post('/cps/resolve', async (req, res) => {
    try {
      const { filePath = '.', userPrompt = '', maxTokens } = req.body || {};
      const prompt = await resolver.generatePrompt(filePath, userPrompt);
      res.json({ success: true, prompt, filePath });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/cps/debug', async (req, res) => {
    try {
      const { filePath = '.', userPrompt = '' } = req.body || {};
      const debug = await resolver.resolveDebug(filePath, userPrompt);
      res.json({ success: true, ...debug });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
}

module.exports = {
  attachCpsRoutes,
};
