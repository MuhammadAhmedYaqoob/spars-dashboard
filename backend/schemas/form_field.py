from pydantic import BaseModel

class FormFieldBase(BaseModel):
    form_type: str
    field_name: str
    field_label: str
    field_type: str
    required: bool = False
    options: str | None = None

class FormFieldCreate(FormFieldBase):
    pass

class FormFieldOut(FormFieldBase):
    id: int
    class Config:
        from_attributes = True
