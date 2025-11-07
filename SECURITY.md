# Security and Secret Management

## Environment Variables and Secrets

This project uses Cloudflare Workers secrets and local environment variables for sensitive configuration.

### Local Development

**`.dev.vars` (Local Only - NOT committed)**

For local development with `wrangler dev`, create a `.dev.vars` file in the project root:

```env
CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

**Important:**
- `.dev.vars` is in `.gitignore` and should NEVER be committed to version control
- Use `.dev.vars.example` as a template
- Each developer needs their own `.dev.vars` with development keys

### Production Deployment

**Cloudflare Secrets (Production)**

Store sensitive values as Wrangler secrets for production:

```bash
# Set production secret key
npx wrangler secret put CLERK_SECRET_KEY
# Paste your production secret key when prompted

# Verify secret is set
npx wrangler secret list
```

**Non-Secret Environment Variables**

Non-sensitive configuration (like publishable keys) goes in `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "CLERK_PUBLISHABLE_KEY": "pk_live_YOUR_PUBLISHABLE_KEY"
  }
}
```

### Security Best Practices

1. **Never commit secrets** - Always use `.dev.vars` (local) or Wrangler secrets (production)
2. **Use separate keys** - Development and production should use different Clerk applications/keys
3. **Rotate keys regularly** - Update keys periodically and after any suspected compromise
4. **Limit key permissions** - Use Clerk's role-based access control appropriately
5. **Review `.gitignore`** - Ensure `.dev.vars` and other secret files are properly ignored

### What Goes Where

| Type | Location | Committed? | Notes |
|------|----------|-----------|-------|
| Development secrets | `.dev.vars` | ❌ No | Local only, gitignored |
| Production secrets | Wrangler secrets | ❌ No | Stored in Cloudflare |
| Public config | `wrangler.jsonc` vars | ✅ Yes | Non-sensitive only |
| Secret templates | `.dev.vars.example` | ✅ Yes | No actual values |

### If Secrets Are Compromised

If you accidentally commit secrets to git:

1. **Immediately rotate the keys** in Clerk dashboard
2. Update `.dev.vars` locally with new keys
3. Update Wrangler secrets: `npx wrangler secret put CLERK_SECRET_KEY`
4. Remove secrets from git history (consider using `git filter-branch` or BFG Repo-Cleaner)
5. Force push the cleaned history (coordinate with team)

### Verifying Setup

Check your configuration:

```bash
# Verify local dev setup
cat .dev.vars  # Should exist and contain keys

# Verify production secrets
npx wrangler secret list  # Should show CLERK_SECRET_KEY

# Verify non-secret config
cat wrangler.jsonc | grep CLERK_PUBLISHABLE_KEY
```

### Additional Resources

- [Cloudflare Workers Secrets Documentation](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Clerk Authentication Best Practices](https://clerk.com/docs/security/overview)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)

