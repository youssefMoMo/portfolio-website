// ═══════════════════════════════════════════════════════════════
// CONTACT FORM HOOK - FIXED VERSION
// src/hooks/use-contact.ts
// ═══════════════════════════════════════════════════════════════

import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react"; // ✅ أضف استيراد React hooks

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type ContactFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type ContactSubmissionResponse = {
  success: boolean;
  messageId?: string;
  timestamp?: string;
  message?: string;
};

export type ContactFormErrors = Partial<Record<keyof ContactFormData, string>> & {
  general?: string;
};

export type UseSubmitContactReturn = UseMutationResult<
  ContactSubmissionResponse,
  Error,
  ContactFormData
> & {
  isSubmitting: boolean;
  resetForm: () => void;
  hasFieldError: (field: keyof ContactFormData) => boolean;
  getFieldError: (field: keyof ContactFormData) => string | undefined;
};

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONTACT_API_ENDPOINT = 
  import.meta.env.VITE_CONTACT_API_URL || "/api/contact";

const REQUEST_TIMEOUT = 30000;

// ═══════════════════════════════════════════════════════════════
// VALIDATION RULES - FIXED TYPE DEFINITION
// ═══════════════════════════════════════════════════════════════

interface BaseValidationRule {
  required?: boolean;
  message: {
    required: string;
  };
}

interface StringValidationRule extends BaseValidationRule {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message: BaseValidationRule["message"] & {
    minLength?: string;
    maxLength?: string;
    pattern?: string;
  };
}

interface EmailValidationRule extends BaseValidationRule {
  pattern: RegExp;
  message: {
    required: string;
    pattern: string;
  };
}

type FieldValidationRule = StringValidationRule | EmailValidationRule;

const VALIDATION_RULES: Record<keyof ContactFormData, FieldValidationRule> = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'-]+$/,
    message: {
      required: "Name is required",
      minLength: "Name must be at least 2 characters",
      maxLength: "Name must not exceed 100 characters",
      pattern: "Please enter a valid name",
    },
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: {
      required: "Email is required",
      pattern: "Please enter a valid email address",
    },
  },
  subject: {
    required: true,
    minLength: 5,
    maxLength: 200,
    message: {
      required: "Subject is required",
      minLength: "Subject must be at least 5 characters",
      maxLength: "Subject must not exceed 200 characters",
    },
  },
  message: {
    required: true,
    minLength: 10,
    maxLength: 2000,
    message: {
      required: "Message is required",
      minLength: "Message must be at least 10 characters",
      maxLength: "Message must not exceed 2000 characters",
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS - FIXED
// ═══════════════════════════════════════════════════════════════

function validateField<K extends keyof ContactFormData>(
  field: K,
  value: ContactFormData[K]
): string | null {
  const rules = VALIDATION_RULES[field];
  
  if (rules.required && (!value || String(value).trim() === "")) {
    return rules.message.required;
  }
  
  if (value && typeof value === "string") {
    const trimmed = value.trim();
    
    // ✅ استخدم "key" in rules للتحقق من وجود الخاصية قبل الوصول إليها
    if ("minLength" in rules && rules.minLength && trimmed.length < rules.minLength) {
      return rules.message.minLength ?? rules.message.required;
    }
    
    if ("maxLength" in rules && rules.maxLength && trimmed.length > rules.maxLength) {
      return rules.message.maxLength ?? rules.message.required;
    }
    
    if ("pattern" in rules && rules.pattern && !rules.pattern.test(trimmed)) {
      return rules.message.pattern ?? rules.message.required;
    }
  }
  
  return null;
}

export function validateContactForm(
  data: ContactFormData
): ContactFormErrors | null {
  const errors: ContactFormErrors = {};
  
  (Object.keys(VALIDATION_RULES) as Array<keyof ContactFormData>).forEach(
    (field) => {
      const error = validateField(field, data[field]);
      if (error) {
        errors[field] = error;
      }
    }
  );
  
  return Object.keys(errors).length > 0 ? errors : null;
}

function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, "").trim();
}

export function sanitizeContactData(data: ContactFormData): ContactFormData {
  return {
    name: sanitizeInput(data.name),
    email: sanitizeInput(data.email).toLowerCase(),
    subject: sanitizeInput(data.subject),
    message: sanitizeInput(data.message),
  };
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function submitContactAPI(
  data: ContactFormData
): Promise<ContactSubmissionResponse> {
  if (!import.meta.env.VITE_CONTACT_API_URL) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    if (Math.random() > 0.1) {
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        timestamp: new Date().toISOString(),
        message: "Message received (mock mode)",
      };
    } else {
      throw new Error("Mock API error - please try again");
    }
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(CONTACT_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(sanitizeContactData(data)),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: ContactSubmissionResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || "Submission failed");
    }
    
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout - please check your connection and try again");
    }
    
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN HOOK - FIXED
// ═══════════════════════════════════════════════════════════════

export function useSubmitContact(): UseSubmitContactReturn {
  const { toast } = useToast();

  const mutation = useMutation<ContactSubmissionResponse, Error, ContactFormData>({
    mutationFn: submitContactAPI,
    
    retry: (failureCount, error) => {
      return failureCount < 2 && (error.message.includes("network") || error.message.includes("timeout"));
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    
    onMutate: (variables) => {
      const errors = validateContactForm(variables);
      if (errors) {
        throw new Error(JSON.stringify(errors));
      }
      return { sanitizedData: sanitizeContactData(variables) };
    },
    
    onSuccess: (data, variables) => {
      toast({
        title: "Message sent!",
        description: data.message || "Thanks for reaching out. I'll get back to you soon.",
        variant: "default",
      });
    },
    
    onError: (error: Error) => {
      try {
        const validationErrors = JSON.parse(error.message) as ContactFormErrors;
        const firstError = Object.values(validationErrors)[0];
        toast({
          title: "Validation Error",
          description: firstError || "Please check your input",
          variant: "destructive",
          duration: 5000,
        });
        return;
      } catch {
        // Not a validation error
      }
      
      let description = "Failed to send message. Please try again later.";
      
      if (error.message.includes("timeout")) {
        description = "Request timed out. Please check your connection and try again.";
      } else if (error.message.includes("network")) {
        description = "Network error. Please check your internet connection.";
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        title: "Error",
        description,
        variant: "destructive",
        duration: 6000,
      });
    },
  });

  return {
    ...mutation,
    isSubmitting: mutation.isPending,
    resetForm: () => mutation.reset(),
    
    hasFieldError: (field: keyof ContactFormData): boolean => {
      if (!mutation.error) return false;
      try {
        const errors = JSON.parse(mutation.error.message) as ContactFormErrors;
        return field in errors;
      } catch {
        return false;
      }
    },
    
    getFieldError: (field: keyof ContactFormData): string | undefined => {
      if (!mutation.error) return undefined;
      try {
        const errors = JSON.parse(mutation.error.message) as ContactFormErrors;
        return errors[field];
      } catch {
        return undefined;
      }
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// useContactForm HOOK - FIXED MISSING IMPORTS & TOAST
// ═══════════════════════════════════════════════════════════════

export function useContactForm() {
  const { mutate, isSubmitting, resetForm, getFieldError, ...mutation } = useSubmitContact();
  const { toast } = useToast(); // ✅ أضف استيراد toast هنا
  
  const [formData, setFormData] = useState<ContactFormData>({
    name: "", email: "", subject: "", message: "",
  });
  
  const [touched, setTouched] = useState<Record<keyof ContactFormData, boolean>>({
    name: false, email: false, subject: false, message: false,
  });

  const updateField = useCallback(<K extends keyof ContactFormData>(
    field: K,
    value: ContactFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const markTouched = useCallback((field: keyof ContactFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    Object.keys(formData).forEach(key => {
      markTouched(key as keyof ContactFormData);
    });
    
    const errors = validateContactForm(formData);
    if (errors) {
      const firstError = Object.values(errors)[0];
      toast({
        title: "Validation Error",
        description: firstError,
        variant: "destructive",
      });
      return;
    }
    
    mutate(formData, {
      onSuccess: () => {
        setFormData({ name: "", email: "", subject: "", message: "" });
        setTouched({ name: false, email: false, subject: false, message: false });
        resetForm();
      },
    });
  }, [formData, mutate, resetForm, markTouched, toast]); // ✅ أضف toast للـ dependencies

  return {
    formData,
    touched,
    isSubmitting,
    error: mutation.error,
    updateField,
    markTouched,
    getFieldError,
    handleSubmit,
    reset: () => {
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTouched({ name: false, email: false, subject: false, message: false });
      resetForm();
    },
  };
}