import { Button, Form, Input, InputNumber } from "antd";
import {
  parsePriceCents,
  QUOTE_LIMITS,
} from "@device-service-hub/contracts/quote-rules";
import { createEmptyQuoteItem } from "../formValues";
import styles from "../quotes.module.css";

/** Fields use the parent Form context; submission and request intent stay in the modal. */
export default function QuoteItemsFields({ disabled }: { disabled: boolean }) {
  return (
    <Form.List name="items">
      {(fields, { add, remove }) => (
        <div className={styles.items}>
          {fields.map(({ key, name }, index) => (
            <section
              key={key}
              className={styles.item}
              aria-label={`报价条目 ${index + 1}`}
            >
              <div className={styles.row}>
                <strong>项目 {index + 1}</strong>
                <Button
                  size="small"
                  disabled={disabled || fields.length === 1}
                  onClick={() => remove(name)}
                >
                  删除条目 {index + 1}
                </Button>
              </div>
              <Form.Item
                name={[name, "name"]}
                label="项目或配件名称"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "请填写名称",
                  },
                  { max: QUOTE_LIMITS.name },
                ]}
              >
                <Input
                  autoComplete="off"
                  aria-label={`项目名称 ${index + 1}`}
                  maxLength={QUOTE_LIMITS.name}
                />
              </Form.Item>
              <div className={styles.fields}>
                <Form.Item
                  name={[name, "quantity"]}
                  label="数量"
                  rules={[
                    { required: true },
                    {
                      type: "integer",
                      min: 1,
                      max: QUOTE_LIMITS.quantity,
                      message: "数量须为 1～999 的整数",
                    },
                  ]}
                >
                  <InputNumber
                    autoComplete="off"
                    aria-label={`数量 ${index + 1}`}
                    min={1}
                    max={QUOTE_LIMITS.quantity}
                    step={1}
                    className={styles.fullWidth}
                  />
                </Form.Item>
                <Form.Item
                  name={[name, "unitPrice"]}
                  label="单价（元）"
                  rules={[
                    {
                      validator: (_, value: string) => {
                        try {
                          parsePriceCents(value ?? "");
                          return Promise.resolve();
                        } catch (error) {
                          return Promise.reject(error);
                        }
                      },
                    },
                  ]}
                >
                  <Input
                    autoComplete="off"
                    aria-label={`单价 ${index + 1}`}
                    inputMode="decimal"
                    placeholder="例如 120.50"
                    maxLength={10}
                  />
                </Form.Item>
              </div>
              <Form.Item
                name={[name, "note"]}
                label="备注"
                rules={[{ max: QUOTE_LIMITS.note }]}
              >
                <Input.TextArea
                  autoComplete="off"
                  showCount
                  aria-label={`备注 ${index + 1}`}
                  rows={2}
                  maxLength={QUOTE_LIMITS.note}
                />
              </Form.Item>
            </section>
          ))}
          <Button
            disabled={disabled || fields.length >= QUOTE_LIMITS.items}
            onClick={() => add(createEmptyQuoteItem())}
          >
            添加报价条目
          </Button>
        </div>
      )}
    </Form.List>
  );
}
