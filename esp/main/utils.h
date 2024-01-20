#include "esp_log.h"
#include "esp_tls.h"

#define UTILS "utils"

#define ERROR_CHECK(x) do { \
    if ((x) < 0) { \
        ESP_ERROR_CHECK(ESP_FAIL); \
    } \
} while(0)

#define NULL_CHECK(x) do { \
    if ((x) == NULL) { \
        ESP_ERROR_CHECK(ESP_FAIL); \
    } \
} while(0)

#define MAX(x, y) ((x) > (y) ? (x) : (y))
#define MIN(x, y) ((x) < (y) ? (x) : (y))

int Esp_tls_conn_write(esp_tls_t *tls, const void *data, int len) {
    int written_bytes = 0;
    while (written_bytes < len) {
        int bytes_written = esp_tls_conn_write(tls, data + written_bytes, len - written_bytes);
        if (bytes_written < 0 && bytes_written != ESP_TLS_ERR_SSL_WANT_READ && bytes_written != ESP_TLS_ERR_SSL_WANT_WRITE) {
            char buf[256];
            mbedtls_strerror(bytes_written, buf, 255);
            ESP_LOGE(UTILS, "esp_tls_conn_write failed: -0x%x - %s", -bytes_written, buf);
            return -1;
        }
        written_bytes += bytes_written;
    }
    return written_bytes;
}

int Esp_tls_conn_read(esp_tls_t *tls, void *data, int len) {
    int read_bytes = 0;
    while (read_bytes < len) {
        int bytes_read = esp_tls_conn_read(tls, data + read_bytes, len - read_bytes);
        if (bytes_read < 0 && bytes_read != ESP_TLS_ERR_SSL_WANT_READ && bytes_read != ESP_TLS_ERR_SSL_WANT_WRITE) {
            char buf[256];
            mbedtls_strerror(bytes_read, buf, 255);
            ESP_LOGE(UTILS, "esp_tls_conn_read failed: -0x%x - %s", -bytes_read, buf);
            return -1;
        }
        read_bytes += bytes_read;
    }
    return read_bytes;
}
