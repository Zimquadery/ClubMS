FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_UNIVERSITY_NAME
ARG VITE_PRIMARY_BRAND_COLOR
ARG VITE_LOGO_URL
ENV VITE_UNIVERSITY_NAME=$VITE_UNIVERSITY_NAME
ENV VITE_PRIMARY_BRAND_COLOR=$VITE_PRIMARY_BRAND_COLOR
ENV VITE_LOGO_URL=$VITE_LOGO_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
