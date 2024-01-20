idf_component_register(SRCS "main.c" "wifi.c" "servo.c"
                    INCLUDE_DIRS ""
                    EMBED_TXTFILES server_root_cert.pem myselfsignedcert.pem)
