export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  first_name: string;
  last_name: string;
  role: ('student' | 'teacher' | 'admin')[];
  document_type: 'dni' | 'passport' | 'cedula' | 'other';
  document_number: string;
  profile_photo_url?: string;
  whatsapp?: string;
  social_networks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  street_address: string;
  street_number: string;
  locality: string;
  department: string;
  province: string;
  postal_code: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  document_type: 'dni' | 'passport' | 'cedula' | 'other';
  document_number: string;
  whatsapp: string;
  social_networks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  street_address: string;
  street_number: string;
  locality: string;
  department: string;
  province: string;
  postal_code: string;
  country: string;
}