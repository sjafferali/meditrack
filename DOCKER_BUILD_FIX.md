# Docker Build Fix for GitHub Actions

## Problem Identified

The GitHub Actions workflow was failing with the following error:

```
ERROR: failed to solve: failed to compute cache key: failed to calculate checksum of ref lb3s0avzltukumcdfbij5royf::6gw8bklllz8hnhrrbg368lthd: "/frontend/public/static/js/person-initializer.js": not found
```

## Root Cause

There was a mismatch between:

1. The Docker build context: Set to `backend/` in the GitHub Actions workflow
2. The Dockerfile: Expected paths relative to the root directory (like `frontend/` and `backend/`)

When Docker tries to build with the backend directory as the context, it can't access files outside that context (like `../frontend/`), leading to the error.

## Solution

The fix was to update the GitHub Actions workflow to use the root directory as the Docker build context:

```yaml
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .                # Changed from 'backend' to '.'
    file: ./Dockerfile        # Using the root Dockerfile
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    labels: ${{ steps.meta.outputs.labels }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

This ensures that:

1. The Docker build can access all files in the repository
2. Paths like `frontend/` and `backend/` in the Dockerfile are correctly resolved
3. The build process completes successfully

## File Paths and Docker Context

In Docker, the build context determines what files are available during the build. Paths in the Dockerfile are relative to this context.

- When using `context: .`, paths like `frontend/` and `backend/` work correctly
- When using `context: backend/`, paths would need to be relative to that directory (and can't access parent directories)

## Recommendations for Future Development

1. Always ensure Docker build contexts match the expectations in your Dockerfile
2. Prefer using the root directory as the build context when your Dockerfile references multiple subdirectories
3. If using a subdirectory as the context, ensure all necessary files are within that context

With this fix in place, the GitHub Actions workflow should successfully build and push the Docker image to Docker Hub.