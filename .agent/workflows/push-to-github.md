---
description: how to push changes to GitHub following the Nova Scotia Immigration Tracker branching rules
---

1. Ensure you are on the `develop` branch
```bash
git checkout develop
```

2. Stage and commit changes with a descriptive message
```bash
git add . ; git commit -m "update: [brief description of changes]"
```

// turbo
3. Push to Staging (develop branch)
```bash
git push origin develop
```

> [!IMPORTANT]
> - Never push directly to `main`.
> - Only merge `develop` into `main` after USER approval for Production deployment.
