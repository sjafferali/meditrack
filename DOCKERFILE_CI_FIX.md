# Dockerfile CI Fix for GitHub Actions

## Problem Identified

The GitHub Actions workflow was failing with the following error:

```
ERROR: failed to solve: failed to compute cache key: failed to calculate checksum of ref vp1r9taaazzagz0qr95c1boms::e2sf2i6x68amenjzt24h4p4a0: "/frontend/public/static/js/person-initializer.js": not found
```

Even though we configured the Docker build context to use the root directory (`.`), the Docker command was still being executed with `backend` as a positional argument:

```
/usr/bin/docker buildx build ... --push backend
```

This was overriding our context setting and causing the build to fail.

## Solution

We completely redesigned the Docker build process in GitHub Actions to avoid the multi-stage build issues and context problems:

1. **Simplified Docker Build Process**:
   - Build the frontend directly in the GitHub Actions workflow
   - Copy the built frontend files to the backend/app/static directory
   - Create a new simplified `Dockerfile.ci` that doesn't use multi-stage builds
   - Use the root context but with the simplified Dockerfile

2. **Created a CI-specific Dockerfile**: 
   - No multi-stage build (frontend already built in the workflow)
   - Uses pre-copied files from the repository
   - Avoids path navigation issues

3. **Key Changes**:
   - The `Dockerfile.ci` is generated during the workflow
   - Frontend is built and copied to backend static directory before Docker build
   - No relative paths (`../frontend`) are used in the Dockerfile

## Implementation Details

The workflow now:

1. Builds the frontend using Node.js
2. Copies the built frontend files to the backend/app/static directory
3. Creates a simplified Dockerfile.ci that assumes frontend is pre-built
4. Builds the Docker image using the root context and the simplified Dockerfile.ci
5. Pushes the image to Docker Hub

This approach avoids the path navigation and context issues that were causing the Docker build to fail.

## Benefits of This Approach

1. **Simplified Debugging**: By building the frontend separately, issues with frontend builds are easier to diagnose
2. **Clearer Separation of Concerns**: Each build step does one thing clearly
3. **More Explicit Dependencies**: The workflow makes clear what files need to go where
4. **Avoids Context Issues**: No need to juggle contexts between different directories

This change should make the CI/CD pipeline more robust while maintaining the same functionality.